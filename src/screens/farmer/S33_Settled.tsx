/**
 * S33 — a settled deal. Stitch `33_settled_transaction_receipt`.
 *
 * ★ This screen was the worst thing in the app, and it is worth writing down
 *   exactly what it claimed, because none of it came from a query:
 *
 *     "₹76,000 credited"        a bank credit that never happened
 *     "State Bank of India"     a bank nobody named
 *     "A/C ·······4209"         an account number belonging to no one
 *     "RTGS #SD-2024-8842"      a payment reference for no payment
 *     "धर्मकाटा पावती #DK-7712"  a weighbridge slip for no weighing
 *     "Form 13", "e-Tax Valid"  a statutory APMC receipt, asserted valid
 *
 *   All of it hardcoded in the i18n dictionaries, identical for every farmer
 *   in every language. `CLAUDE.md` §9 names unlabelled synthetic data shown
 *   to a government panel as the one unrecoverable mistake available to this
 *   team; a fabricated bank credit and a fabricated statutory receipt are the
 *   two worst objects that could have been on it.
 *
 * ★ What is here instead is the transaction: gross, deductions, net, and the
 *   `RELEASED` event from the append-only ledger with the date it actually
 *   carries. `TxDto` has no bank, no account, no payment reference and no
 *   receipt number, so this screen has none either.
 *
 * ★ There is no "download the tax receipt" button. The app cannot produce a
 *   Form 13 — that is an APMC document, issued by the mandi, and offering a
 *   PDF of one would be forging it. The screen says where the receipt comes
 *   from instead.
 *
 * ★ ZERO EMOJIS. ★ Loading, empty, error and data all render.
 */

import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontFamily, radius, space, type as typography } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { ListenButton } from '../../components/ui/ListenButton';
import { useT } from '../../lib/i18n';
import { formatPaise, formatQuintal } from '../../lib/money';
import { formatDateShort } from '../../lib/dates';
import { getEscrowEvents, getTransaction } from '../../lib/api';
import { USE_FIXTURES } from '../../config';
import { fxEscrowEvents, fxTx } from '../../fixtures/escrow';
import { ErrorState, Skeleton } from '../../components/farmer/States';
import type { MyLotsStackParamList } from '../../navigation/FarmerTabs';
import type { EscrowEvent, TxDto } from '../../types/api';

type Props = NativeStackScreenProps<MyLotsStackParamList, 'S33_Settled'>;

async function fetchTx(txId: string): Promise<TxDto> {
  if (USE_FIXTURES) return fxTx;
  return getTransaction(txId);
}

async function fetchEvents(txId: string): Promise<EscrowEvent[]> {
  if (USE_FIXTURES) return fxEscrowEvents;
  return getEscrowEvents(txId);
}

export default function S33_Settled({ navigation, route }: Props) {
  const { t, locale } = useT();
  const txId = route.params?.tx_id ?? null;

  const txQuery = useQuery({
    queryKey: ['tx', txId],
    queryFn: () => fetchTx(txId!),
    enabled: txId !== null,
  });
  const eventsQuery = useQuery({
    queryKey: ['tx', txId, 'events'],
    queryFn: () => fetchEvents(txId!),
    enabled: txId !== null,
  });

  const tx = txQuery.data ?? null;
  const released = (eventsQuery.data ?? []).find(e => e.to_status === 'RELEASED') ?? null;

  const narration = tx
    ? t('st_narr', {
        net: formatPaise(tx.net_paise, locale),
        qty: formatQuintal(tx.qty_kg, locale),
        rate: formatPaise(tx.price_paise_per_qtl, locale),
      })
    : t('st_no_tx_title');

  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.canGoBack() && navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel={t('back_button')}>
        <Icon name="arrow-left" size={20} color={colors.onSurface} />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>{t('st_title')}</Text>
        {tx ? <Text style={styles.headerSub}>{t('tr_ref', { id: tx.id })}</Text> : null}
      </View>
      <ListenButton text={narration} />
    </View>
  );

  if (txId === null) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {header}
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Icon name="info" size={24} color={colors.outline} />
          </View>
          <Text style={styles.emptyTitle}>{t('tr_no_tx_title')}</Text>
          <Text style={styles.emptyBody}>{t('tr_no_tx_body')}</Text>
        </View>
      </View>
    );
  }

  if (txQuery.isLoading || eventsQuery.isLoading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {header}
        <View style={styles.scroll}>
          <Skeleton height={140} />
          <View style={{ height: space.sm }} />
          <Skeleton height={180} />
        </View>
      </View>
    );
  }

  if (txQuery.error && !tx) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {header}
        <ErrorState message={t('tr_fetch_error')} onRetry={() => txQuery.refetch()} />
      </View>
    );
  }

  if (!tx) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {header}
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t('st_no_tx_title')}</Text>
        </View>
      </View>
    );
  }

  /* ★ A transaction that has not reached RELEASED has not been paid out, and
     this screen will not say otherwise. It sends the farmer back to the
     tracking view rather than rendering a settlement that has not happened —
     which is precisely what the old screen did unconditionally. */
  const isReleased = tx.status === 'RELEASED' || released !== null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      {header}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!isReleased ? (
          <View style={styles.pendingCard}>
            <Icon name="info" size={18} color={colors.onSurfaceVariant} />
            <Text style={styles.pendingText}>{t('st_not_released')}</Text>
          </View>
        ) : (
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <Icon name="check-circle" size={18} color={colors.onPositiveContainer} />
              <Text style={styles.heroBadge}>{t('st_paid_badge')}</Text>
            </View>
            <Text style={styles.heroValue}>{formatPaise(tx.net_paise, locale)}</Text>
            {released ? (
              <Text style={styles.heroSub}>
                {t('st_released_on', {
                  date: formatDateShort(released.created_at.slice(0, 10), locale, ''),
                })}
              </Text>
            ) : null}
          </View>
        )}

        {/* ── The figures, all four from the transaction ──────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('st_figures_title')}</Text>
          <View style={styles.row}>
            <Text style={styles.rowKey}>{t('st_rate')}</Text>
            <Text style={styles.rowVal}>{formatPaise(tx.price_paise_per_qtl, locale)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowKey}>{t('st_qty')}</Text>
            <Text style={styles.rowVal}>
              {t('bfl_lot_qty', { qty: formatQuintal(tx.qty_kg, locale) })}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowKey}>{t('dd_gross')}</Text>
            <Text style={styles.rowVal}>{formatPaise(tx.gross_paise, locale)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowKey}>{t('dd_deductions')}</Text>
            <Text style={[styles.rowVal, styles.rowValNeg]}>
              −{formatPaise(tx.deductions_paise, locale)}
            </Text>
          </View>
          <View style={styles.rowTotal}>
            <Text style={styles.rowTotalKey}>{t('dd_net_label')}</Text>
            <Text style={styles.rowTotalVal}>{formatPaise(tx.net_paise, locale)}</Text>
          </View>
        </View>

        {/* ★ Where the paper actually comes from. The app does not issue it,
             and does not offer to. */}
        <View style={styles.noteCard}>
          <Icon name="info" size={16} color={colors.onSurfaceVariant} />
          <Text style={styles.noteText}>{t('st_receipt_note')}</Text>
        </View>

        <TouchableOpacity
          style={styles.secondaryCta}
          onPress={() => navigation.navigate('S32_DealTracking', { tx_id: tx.id })}
          accessibilityRole="button">
          <Text style={styles.secondaryCtaText}>{t('st_view_timeline')}</Text>
          <Icon name="arrow-right" size={16} color={colors.primary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.xl + 8,
    paddingBottom: space.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, minWidth: 0 },
  headerTitle: { ...typography.titleLg, color: colors.onSurface, fontFamily: fontFamily.extraBold },
  headerSub: { ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },

  scroll: { padding: space.md, paddingBottom: space.xxl, gap: space.sm },

  heroCard: {
    gap: 2,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.positiveContainer,
    borderWidth: 1,
    borderColor: colors.tertiary,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroBadge: { ...typography.labelMd, color: colors.onPositiveContainer, flex: 1 },
  heroValue: {
    ...typography.displayLg,
    color: colors.onPositiveContainer,
    fontFamily: fontFamily.extraBold,
  },
  heroSub: { ...typography.labelSm, color: colors.onPositiveContainer },

  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  pendingText: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1, lineHeight: 19 },

  card: {
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    gap: space.xs,
  },
  cardTitle: { ...typography.titleMd, color: colors.onSurface },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  rowKey: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1 },
  rowVal: { ...typography.titleMd, color: colors.onSurface },
  rowValNeg: { color: colors.critical },
  rowTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    marginTop: 2,
    paddingTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  rowTotalKey: { ...typography.titleMd, color: colors.onSurface, flex: 1 },
  rowTotalVal: { ...typography.titleLg, color: colors.primary, fontFamily: fontFamily.extraBold },

  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
  },
  noteText: { ...typography.labelSm, color: colors.onSurfaceVariant, flex: 1, lineHeight: 17 },

  emptyCard: {
    alignItems: 'center',
    gap: 8,
    margin: space.md,
    padding: space.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { ...typography.titleLg, color: colors.onSurface, textAlign: 'center' },
  emptyBody: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 19,
  },

  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: space.sm,
  },
  secondaryCtaText: { ...typography.titleMd, color: colors.primary },
});
