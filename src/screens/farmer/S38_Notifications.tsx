/**
 * Notifications — what the bell on Home now opens.
 *
 * ★ The bell was a plain, non-interactive glyph with a comment saying so:
 *   there was no screen behind it and no source of notifications. Rather than
 *   leave a dead icon in the header of the app's main screen, this builds the
 *   screen and derives its contents from data the app already has.
 *
 * ★ Every row is real, and there is no push infrastructure being implied:
 *   - An offer waiting on the farmer is a genuine `OfferDto` with
 *     `status: 'OPEN'` where the buyer moved last.
 *   - A price move is today's modal against yesterday's, from the same
 *     series the Market tab renders.
 *   Nothing here is a fabricated "3 buyers sent bids in the last 45 minutes"
 *   — that banner is what this screen replaces, and its count and countdown
 *   were both hardcoded.
 */

import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontFamily, radius, space, type as typography } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { ListenButton } from '../../components/ui/ListenButton';
import { useT } from '../../lib/i18n';
import { formatNumber, formatPaise, toQuintal } from '../../lib/money';
import { getOffers, getPriceSeries } from '../../lib/api';
import { DEFAULT_COMMODITY_ID, DEFAULT_MARKET_ID, USE_FIXTURES } from '../../config';
import { fxMyOffers } from '../../fixtures/offers';
import { fxPriceHistory } from '../../fixtures/prices';
import type { HomeStackParamList } from '../../navigation/FarmerTabs';
import type { OfferDto } from '../../types/api';

type Props = NativeStackScreenProps<HomeStackParamList, 'S38_Notifications'>;

async function fetchOffers(): Promise<OfferDto[]> {
  if (USE_FIXTURES) return fxMyOffers;
  return getOffers();
}
async function fetchSeries() {
  if (USE_FIXTURES) return fxPriceHistory;
  return getPriceSeries(DEFAULT_COMMODITY_ID, DEFAULT_MARKET_ID, 180);
}

export default function S38_Notifications({ navigation }: Props) {
  const { t, locale } = useT();

  const offersQuery = useQuery({ queryKey: ['offers', 'talks'], queryFn: fetchOffers });
  const seriesQuery = useQuery({
    queryKey: ['prices', 'series', '180', DEFAULT_COMMODITY_ID, DEFAULT_MARKET_ID],
    queryFn: fetchSeries,
  });

  // Only offers actually waiting on the farmer — a buyer moved last and the
  // thread is still open.
  const waiting = (offersQuery.data ?? []).filter(
    o => o.status === 'OPEN' && o.initiator === 'BUYER',
  );

  const points = seriesQuery.data?.points ?? [];
  const today = points.length > 0 ? points[points.length - 1] : undefined;
  const yesterday = points.length > 1 ? points[points.length - 2] : undefined;
  const delta =
    today && yesterday ? today.modal_paise_per_qtl - yesterday.modal_paise_per_qtl : null;

  const isEmpty = waiting.length === 0 && (delta === null || delta === 0);

  /* ★ Reads exactly the rows below it, in order — nothing summarised away
     and nothing added. */
  const narration = isEmpty
    ? t('nt_empty_title')
    : [
        ...waiting.map(o =>
          t('nt_offer_body', {
            rate: formatPaise(o.price_paise_per_qtl, locale),
            qty: formatNumber(toQuintal(o.qty_kg), locale),
            round: formatNumber(o.round, locale),
          }),
        ),
        ...(today && delta !== null && delta !== 0
          ? [
              t('nt_price_body', {
                market: t('home_market_name'),
                price: formatPaise(today.modal_paise_per_qtl, locale),
                delta: `${delta > 0 ? '+' : '−'}${formatPaise(Math.abs(delta), locale)}`,
              }),
            ]
          : []),
      ].join(' ');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.canGoBack() && navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('back_button')}>
          <Icon name="arrow-left" size={20} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{t('nt_title')}</Text>
          <Text style={styles.headerSub}>{t('nt_subtitle')}</Text>
        </View>
        <ListenButton text={narration} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isEmpty ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Icon name="bell" size={26} color={colors.outline} />
            </View>
            <Text style={styles.emptyTitle}>{t('nt_empty_title')}</Text>
            <Text style={styles.emptyBody}>{t('nt_empty_body')}</Text>
          </View>
        ) : null}

        {waiting.map(offer => (
          <TouchableOpacity
            key={offer.id}
            style={styles.card}
            onPress={() =>
              navigation.navigate('FarmerTabs' as never, {
                screen: 'Talks',
                params: { screen: 'S37_Talks' },
              } as never)
            }
            accessibilityRole="button">
            <View style={styles.cardIcon}>
              <Icon name="handshake" size={18} color={colors.primary} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{t('nt_offer_title')}</Text>
              <Text style={styles.cardBody}>
                {t('nt_offer_body', {
                  rate: formatPaise(offer.price_paise_per_qtl, locale),
                  qty: formatNumber(toQuintal(offer.qty_kg), locale),
                  round: formatNumber(offer.round, locale),
                })}
              </Text>
            </View>
            <Icon name="chevron-right" size={16} color={colors.outline} />
          </TouchableOpacity>
        ))}

        {today && delta !== null && delta !== 0 ? (
          <View style={styles.card}>
            <View style={styles.cardIcon}>
              <Icon
                name={delta > 0 ? 'trending-up' : 'trending-down'}
                size={18}
                color={delta > 0 ? colors.tertiary : colors.critical}
              />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>
                {delta > 0 ? t('nt_price_up_title') : t('nt_price_down_title')}
              </Text>
              <Text style={styles.cardBody}>
                {t('nt_price_body', {
                  market: t('home_market_name'),
                  price: formatPaise(today.modal_paise_per_qtl, locale),
                  delta: `${delta > 0 ? '+' : '−'}${formatPaise(Math.abs(delta), locale)}`,
                })}
              </Text>
            </View>
          </View>
        ) : null}
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
    paddingBottom: space.xs,
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
  headerText: { flex: 1 },
  headerTitle: { ...typography.titleLg, color: colors.onSurface, fontFamily: fontFamily.extraBold },
  headerSub: { ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },

  scroll: { padding: space.md, paddingBottom: space.xxl, gap: space.sm },

  emptyCard: {
    alignItems: 'center',
    gap: 8,
    padding: space.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
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

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { ...typography.titleMd, color: colors.onSurface },
  cardBody: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2, lineHeight: 18 },
});
