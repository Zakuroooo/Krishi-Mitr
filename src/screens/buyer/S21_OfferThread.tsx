/**
 * S21 — the offer thread, rebuilt to the approved Stitch design
 * ("38 Buyer Offer Thread — Live Sauda Negotiation", project 7555855034687361132).
 *
 * ★ What this screen used to be, and why it had to change. It held its own
 *   rounds in `useState` with `price: 1900` — **rupees, in a field the whole
 *   codebase keeps in paise** — and rendered them as `₹{formatNumber(price)}`,
 *   a hand-composed rupee sign bypassing `formatPaise`. That is I1 broken
 *   twice in one line, on the screen where money is the entire subject. It
 *   also invented its own thread, so nothing a farmer sent in S27 or S28 could
 *   ever appear here.
 *
 *   It now reads `OfferDto`s — the same shape `POST /offers` returns — keeps
 *   every figure in paise, and formats only at the render edge.
 *
 * ★ I16, on the buyer's side of the same trade. The farmer's asking price and
 *   today's mandi rate sit side by side in the pinned strip at identical size
 *   and weight. The gap between them is the negotiation; a design that made
 *   either one the hero would be arguing for one side of it.
 *
 * ★ The round cap is the server's, not decoration. CANON returns 409
 *   MAX_ROUNDS past three, so the dock disappears at three rather than letting
 *   a trader compose an offer the API will refuse.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../components/ui/Icon';
import { EmptyState } from '../../components/farmer/States';
import { getLocale } from '../../lib/locale';
import { translate } from '../../lib/i18n';
import { formatNumber, formatPaise, toQuintal } from '../../lib/money';
import { fxIncomingOffer, fxIncomingOfferLastRound, fxOffer } from '../../fixtures/offers';
import { fxMatches } from '../../fixtures/matches';
import { colors, radius, space, touch, type } from '../../theme/tokens';
import type { Locale, OfferDto } from '../../types/api';

/** CANON: the counter cap. Past this the server answers 409 MAX_ROUNDS. */
const MAX_ROUNDS = 3;

/** What the stepper moves by. Mandi bids move in tens, not in ones. */
const STEP_PAISE = 1000;

/**
 * The demo thread, oldest first: the buyer opens, the farmer counters with a
 * note about transport, the buyer's revised bid is live and waiting.
 */
const DEMO_THREAD: OfferDto[] = [fxIncomingOffer, fxOffer, fxIncomingOfferLastRound];

/**
 * Today's mandi rate for the lot being negotiated — the right-hand figure in
 * the pinned strip. Taken from the same fixture the matches desk reads, so the
 * two screens cannot disagree about what the market paid today. `undefined`
 * when the lot is not in the fixture, and then the strip simply shows the ask
 * alone rather than inventing a comparison.
 */
function demoMarketRate(lotRef: string): number | undefined {
  return fxMatches.matches.find(m => m.lot_ref === lotRef)?.market_paise_per_qtl;
}

function statusKey(offer: OfferDto, isLast: boolean): string {
  if (offer.status === 'ACCEPTED') return 'ot_status_accepted';
  if (offer.status === 'REJECTED') return 'ot_status_rejected';
  if (offer.status === 'EXPIRED') return 'ot_status_expired';
  // An open offer that has been countered since is settled in practice; only
  // the newest open one is genuinely waiting on someone.
  return isLast ? 'ot_status_pending' : 'ot_status_rejected';
}

export function S21_OfferThread({
  offers = DEMO_THREAD,
  lotRef = 'A-2291',
  farmerName = 'रामभाऊ पाटील',
  village = 'निफाड',
  grade = 'A',
  marketName,
  marketPaisePerQtl = demoMarketRate('A-2291'),
  onCall,
}: {
  offers?: OfferDto[];
  lotRef?: string;
  farmerName?: string;
  village?: string;
  grade?: string;
  /** Omitted rather than faked when the caller does not know it. */
  marketName?: string;
  marketPaisePerQtl?: number;
  onCall?: () => void;
}) {
  const [locale, setLocale] = useState<Locale>('mr');
  useEffect(() => {
    getLocale().then(l => l && setLocale(l));
  }, []);

  const t = (key: string, params?: Record<string, string | number>) =>
    translate(key, locale, params);

  const latest = offers.length > 0 ? offers[offers.length - 1] : undefined;
  const qtyKg = latest?.qty_kg ?? 0;
  const qtl = toQuintal(qtyKg);

  /** The farmer's most recent ask — the figure a trader is bidding against. */
  const farmerAsk = useMemo(() => {
    for (let i = offers.length - 1; i >= 0; i--) {
      const offer = offers[i];
      if (offer && offer.initiator === 'FARMER') return offer.price_paise_per_qtl;
    }
    return undefined;
  }, [offers]);

  const nextRound = (latest?.round ?? 0) + 1;
  const canCounter = nextRound <= MAX_ROUNDS;

  const [draftPaise, setDraftPaise] = useState<number>(
    latest?.price_paise_per_qtl ?? farmerAsk ?? 0,
  );

  if (offers.length === 0 || !latest) {
    return (
      <View style={[styles.container, styles.content]}>
        <EmptyState title={t('ot_empty')} />
      </View>
    );
  }

  const diff =
    farmerAsk !== undefined && marketPaisePerQtl !== undefined
      ? farmerAsk - marketPaisePerQtl
      : null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Who and what is being negotiated. */}
        <View style={styles.header}>
          <Text style={styles.headerLot}>
            {t('ot_header_lot', { ref: lotRef, commodity: t('commodity_onion') })}
          </Text>
          <View style={styles.headerMeta}>
            <View style={styles.gradeChip}>
              <Text style={styles.gradeText}>{t('post_demand_grade_chip', { grade })}</Text>
            </View>
            <Text style={styles.headerMetaText}>
              {t('ot_lot_weight', { qty: formatNumber(qtl, locale) })}
            </Text>
          </View>
          <Text style={styles.farmerLine}>
            {t('ot_farmer_line', { name: farmerName, village })}
          </Text>
        </View>

        {/*
          The pinned decision. Both figures identical in size and weight — the
          asking price and the mandi rate are the two sides of this trade, and
          the screen does not take one.
        */}
        {farmerAsk === undefined ? null : (
          <View style={styles.priceStrip}>
            <View style={styles.priceCell}>
              <Text style={styles.priceLabel}>{t('ot_asking')}</Text>
              <Text style={styles.priceValue}>{formatPaise(farmerAsk, locale)}</Text>
            </View>
            {marketPaisePerQtl === undefined ? null : (
              <>
                <View style={styles.priceDivider} />
                <View style={styles.priceCell}>
                  <Text style={styles.priceLabel}>
                    {t('ot_market_rate', { market: marketName ?? '' })}
                  </Text>
                  <Text style={styles.priceValue}>
                    {formatPaise(marketPaisePerQtl, locale)}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {diff === null || diff === 0 ? null : (
          <Text style={styles.diffLine}>
            {t('ot_diff_total', {
              diff: formatPaise(Math.abs(diff) * qtl, locale),
              qty: formatNumber(qtl, locale),
            })}
          </Text>
        )}

        {marketName ? <Text style={styles.dayLine}>{t('ot_today_at', { market: marketName })}</Text> : null}

        {/* The thread itself, oldest first. */}
        {offers.map((offer, i) => {
          const isBuyer = offer.initiator === 'BUYER';
          const isLast = i === offers.length - 1;
          const key = statusKey(offer, isLast);
          return (
            <View key={offer.id}>
              <View style={[styles.msgRow, isBuyer ? styles.msgRight : styles.msgLeft]}>
                <View style={[styles.bubble, isBuyer ? styles.bubbleBuyer : styles.bubbleFarmer]}>
                  <Text style={styles.bubbleRole}>
                    {isBuyer ? t('ot_role_buyer') : t('ot_role_farmer', { name: farmerName })}
                  </Text>
                  <Text style={styles.bubbleKind}>
                    {offer.round === 1
                      ? t('ot_initial_ask')
                      : isLast
                      ? t('ot_revised_bid')
                      : t('ot_counter_n', { n: formatNumber(offer.round, locale) })}
                  </Text>
                  <Text style={styles.bubbleRate}>
                    {formatPaise(offer.price_paise_per_qtl, locale)}
                    {t('per_quintal_suffix')}
                  </Text>
                  <Text style={styles.bubbleTotal}>
                    {t('ot_total_amount')}{' '}
                    {formatPaise(offer.price_paise_per_qtl * toQuintal(offer.qty_kg), locale)}
                  </Text>
                  <View style={styles.bubbleFoot}>
                    <View
                      style={[
                        styles.statusChip,
                        key === 'ot_status_pending' && styles.statusPending,
                        key === 'ot_status_accepted' && styles.statusAccepted,
                        key === 'ot_status_rejected' && styles.statusRejected,
                      ]}>
                      <Text
                        style={[
                          styles.statusText,
                          key === 'ot_status_pending' && styles.statusTextPending,
                          key === 'ot_status_accepted' && styles.statusTextAccepted,
                          key === 'ot_status_rejected' && styles.statusTextRejected,
                        ]}>
                        {t(key)}
                      </Text>
                    </View>
                    <Text style={styles.roundText}>
                      {t('ot_round_of', {
                        round: formatNumber(offer.round, locale),
                        max: formatNumber(MAX_ROUNDS, locale),
                      })}
                    </Text>
                  </View>
                </View>
              </View>

              {/* A note a farmer attached rides with his offer, in his words. */}
              {offer.note ? (
                <View style={[styles.msgRow, isBuyer ? styles.msgRight : styles.msgLeft]}>
                  <View style={[styles.noteBubble, isBuyer ? styles.bubbleBuyer : styles.bubbleFarmer]}>
                    <Text style={styles.noteText}>{offer.note}</Text>
                  </View>
                </View>
              ) : null}

              {/* The system line, stated once, between the rounds it separates. */}
              {!isLast && offer.initiator === 'BUYER' ? (
                <Text style={styles.systemLine}>
                  {t('ot_system_rejected', {
                    price: formatPaise(offer.price_paise_per_qtl, locale),
                  })}
                </Text>
              ) : null}
            </View>
          );
        })}

        <View style={styles.activeCard}>
          <Text style={styles.activeLabel}>{t('ot_active_offer')}</Text>
          <Text style={styles.activeRate}>
            {formatPaise(latest.price_paise_per_qtl, locale)}
            {t('per_quintal_suffix')}
          </Text>
          <Text style={styles.activeTotal}>
            {t('ot_total_line', {
              total: formatPaise(latest.price_paise_per_qtl * qtl, locale),
              qty: formatNumber(qtl, locale),
            })}
          </Text>
          <View style={styles.activeFoot}>
            <Icon name="lock" size={14} color={colors.onPositiveContainer} />
            <Text style={styles.activeFootText}>
              {marketName ? t('ot_escrow_note', { market: marketName }) : t('ot_awaiting_farmer')}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* The action dock. Gone entirely at the round cap, because the server
          would refuse the offer this composes. */}
      {canCounter ? (
        <View style={styles.dock}>
          <Text style={styles.dockLabel}>{t('ot_new_rate_label')}</Text>
          <View style={styles.stepper}>
            <Pressable
              onPress={() => setDraftPaise(p => Math.max(0, p - STEP_PAISE))}
              accessibilityRole="button"
              accessibilityLabel="−"
              style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}>
              <Text style={styles.stepBtnText}>−</Text>
            </Pressable>
            <View style={styles.stepReadout}>
              <Text style={styles.stepValue}>{formatPaise(draftPaise, locale)}</Text>
              <Text style={styles.stepTotal}>
                {t('ot_total_line', {
                  total: formatPaise(draftPaise * qtl, locale),
                  qty: formatNumber(qtl, locale),
                })}
              </Text>
            </View>
            <Pressable
              onPress={() => setDraftPaise(p => p + STEP_PAISE)}
              accessibilityRole="button"
              accessibilityLabel="+"
              style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}>
              <Text style={styles.stepBtnText}>+</Text>
            </Pressable>
          </View>
          <View style={styles.dockActions}>
            {onCall ? (
              <Pressable
                onPress={onCall}
                accessibilityRole="button"
                style={({ pressed }) => [styles.callBtn, pressed && styles.stepBtnPressed]}>
                <Icon name="phone" size={17} color={colors.primary} />
                <Text style={styles.callText}>{t('ot_call')}</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.sendBtn, pressed && styles.sendBtnPressed]}>
              <Icon name="tag" size={17} color={colors.onPrimary} />
              <Text style={styles.sendText}>
                {t('ot_send_offer')} · {formatPaise(draftPaise, locale)}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.maxCard}>
          <Text style={styles.maxText}>
            {t('max_rounds_reached', { max: formatNumber(MAX_ROUNDS, locale) })}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.md, paddingBottom: space.xl },

  header: { marginBottom: space.sm },
  headerLot: { ...type.titleLg, color: colors.onSurface },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xxs },
  gradeChip: {
    backgroundColor: colors.positiveContainer,
    borderRadius: radius.sm,
    paddingHorizontal: space.xs,
    paddingVertical: 2,
  },
  gradeText: { ...type.labelSm, color: colors.onPositiveContainer },
  headerMetaText: { ...type.bodySm, color: colors.onSurfaceVariant },
  farmerLine: { ...type.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },

  priceStrip: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.md,
    paddingVertical: space.sm,
  },
  priceCell: { flex: 1, alignItems: 'center', paddingHorizontal: space.xs },
  priceDivider: { width: 1, backgroundColor: colors.borderCard },
  priceLabel: { ...type.labelSm, color: colors.onSurfaceVariant, textAlign: 'center' },
  // ★ Identical for both. See this file's header.
  priceValue: { ...type.numeralData, color: colors.onSurface, marginTop: 2 },
  diffLine: { ...type.bodySm, color: colors.onSurfaceVariant, marginTop: space.xs, textAlign: 'center' },
  dayLine: { ...type.labelMd, color: colors.outline, textAlign: 'center', marginTop: space.sm },

  msgRow: { flexDirection: 'row', marginTop: space.sm },
  msgLeft: { justifyContent: 'flex-start' },
  msgRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '86%', borderRadius: radius.md, borderWidth: 1, padding: space.sm },
  bubbleFarmer: { backgroundColor: colors.surface, borderColor: colors.borderCard },
  bubbleBuyer: { backgroundColor: colors.onPrimaryContainer, borderColor: colors.outlineVariant },
  bubbleRole: { ...type.labelSm, color: colors.onSurfaceVariant },
  bubbleKind: { ...type.labelMd, color: colors.primary, marginTop: 2 },
  bubbleRate: { ...type.numeralData, color: colors.onSurface, marginTop: 2 },
  bubbleTotal: { ...type.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  bubbleFoot: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
  statusChip: {
    borderRadius: radius.sm,
    paddingHorizontal: space.xs,
    paddingVertical: 2,
    backgroundColor: colors.surfaceContainerHigh,
  },
  statusPending: { backgroundColor: colors.warningContainer },
  statusAccepted: { backgroundColor: colors.positiveContainer },
  statusRejected: { backgroundColor: colors.criticalContainer },
  statusText: { ...type.labelSm, color: colors.onSurfaceVariant },
  statusTextPending: { color: colors.warning },
  statusTextAccepted: { color: colors.onPositiveContainer },
  statusTextRejected: { color: colors.criticalSolid },
  roundText: { ...type.labelSm, color: colors.outline },

  noteBubble: { maxWidth: '86%', borderRadius: radius.md, borderWidth: 1, padding: space.sm, marginTop: space.xxs },
  noteText: { ...type.bodySm, color: colors.onSurface },
  systemLine: { ...type.labelMd, color: colors.outline, textAlign: 'center', marginTop: space.sm },

  activeCard: {
    marginTop: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderActive,
    borderRadius: radius.lg,
    padding: space.md,
  },
  activeLabel: { ...type.labelMd, color: colors.primary },
  activeRate: { ...type.numeralHero, color: colors.onSurface, marginTop: 2 },
  activeTotal: { ...type.bodyMd, color: colors.onSurfaceVariant },
  activeFoot: { flexDirection: 'row', alignItems: 'center', gap: space.xxs + 2, marginTop: space.xs },
  activeFootText: { ...type.bodySm, color: colors.onPositiveContainer },

  dock: {
    backgroundColor: colors.surface,
    borderTopWidth: 1.5,
    borderTopColor: colors.borderInput,
    padding: space.md,
  },
  dockLabel: { ...type.labelMd, color: colors.onSurfaceVariant },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginTop: space.xs,
  },
  stepBtn: {
    width: touch.targetMin,
    height: touch.targetMin,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  stepBtnPressed: { backgroundColor: colors.surfaceContainerLow },
  stepBtnText: { ...type.headlineMd, color: colors.primary },
  stepReadout: { flex: 1, alignItems: 'center' },
  stepValue: { ...type.numeralData, color: colors.onSurface },
  stepTotal: { ...type.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },

  dockActions: { flexDirection: 'row', gap: space.xs, marginTop: space.sm },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs + 2,
    minHeight: touch.targetMin,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  callText: { ...type.titleMd, color: colors.primary },
  sendBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs + 2,
    minHeight: touch.targetHero,
    borderRadius: radius.md,
    backgroundColor: colors.primaryContainer,
  },
  sendBtnPressed: { backgroundColor: colors.primary },
  sendText: { ...type.titleMd, color: colors.onPrimary },

  maxCard: {
    margin: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningContainer,
  },
  maxText: { ...type.bodyMd, color: colors.warning },
});
