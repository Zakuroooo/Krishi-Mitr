/**
 * S14 — counter-offer. Demo beat 9 ("the middleman beat"), P10, and one of
 * the two screens PRANAY.md §1.5 says decide whether we win.
 *
 * ★ PRANAY.md §1.5: "The farmer's own forecast is rendered *directly above*
 *   the input box where he types his counter-price. That single layout
 *   decision is the entire 'we removed the middleman' claim, made visible.
 *   The middleman's whole advantage is knowing the price curve when the
 *   farmer does not. Put the curve above the input." The `ForecastFan` below
 *   is not decoration — its position in the JSX, directly above the price
 *   `TextInput`, is the actual feature.
 *
 * ★ CANON §7.6 / FRONTEND_NEEDS_BACKEND.md §6: three actions on an incoming
 *   offer — accept (creates a transaction), reject, or counter (round+1,
 *   `409 MAX_ROUNDS` past round 3). The counter button is disabled on round 3
 *   from `OfferDto.round` itself, not left for the 409 to catch — a farmer
 *   should never be told "no" after typing a price and tapping submit when
 *   the screen already knew.
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fontFamily, radius, space, type as typography } from '../../theme/tokens';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { acceptOffer, counterOffer, getForecast, getOffers, rejectOffer } from '../../lib/api';
import { getLocale } from '../../lib/locale';
import { translate } from '../../lib/i18n';
import { noteText } from '../../lib/offerNote';
import { formatNumber, formatPaise, formatQuintal, quintalValuePaise, toQuintal } from '../../lib/money';
import { DEFAULT_COMMODITY_ID, DEFAULT_HORIZON_DAYS, DEFAULT_MARKET_ID, USE_FIXTURES } from '../../config';
import { fxForecast } from '../../fixtures/forecast';
import { fxTx } from '../../fixtures/escrow';
import { fxIncomingOffer, fxLotOffers } from '../../fixtures/offers';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ListenButton } from '../../components/ui/ListenButton';
import { ForecastFan } from '../../components/charts/ForecastFan';
import { EmptyState, ErrorState, Skeleton } from '../../components/farmer/States';
import type { MyLotsStackParamList } from '../../navigation/FarmerTabs';
import type { ForecastRes, Locale, OfferDto, TxDto } from '../../types/api';

type Props = NativeStackScreenProps<MyLotsStackParamList, 'S14_CounterOffer'>;

const MAX_ROUND = 3;

interface OfferAndForecast {
  offer: OfferDto;
  forecast: ForecastRes;
}

/**
 * `GET /offers/{offer_id}` is not a documented endpoint (FRONTEND_NEEDS_BACKEND.md
 * §6 only names `GET /offers` — the actor-scoped list — and the per-offer
 * action endpoints). Under fixtures this returns the fixed incoming-offer
 * fixture; against a real API it reads the actor-scoped list `getOffers()`
 * already provides and picks the requested id out of it, rather than
 * inventing a single-offer route CANON never defines.
 */
async function fetchOfferAndForecast(offerId: string): Promise<OfferAndForecast | null> {
  const [offer, forecast] = await Promise.all([
    USE_FIXTURES
      /* ★ Was `offerId === fxIncomingOffer.id ? fxIncomingOffer : null`, so
         every offer but one resolved to "offer not found" in fixture mode —
         including the two the buyers list now links here with. */
      ? Promise.resolve(fxLotOffers.find(o => o.id === offerId) ?? null)
      : getOffers().then(offers => offers.find(o => o.id === offerId) ?? null),
    USE_FIXTURES
      ? Promise.resolve(fxForecast)
      : getForecast(DEFAULT_COMMODITY_ID, DEFAULT_MARKET_ID, DEFAULT_HORIZON_DAYS),
  ]);
  if (!offer) return null;
  return { offer, forecast };
}

/** `acceptOffer` returns the created `TxDto`, and this is the *only* moment
 *  the transaction id is reachable: CANON §7.7 has `GET /tx/{id}` but no
 *  `GET /tx` and no `tx_id` on `OfferDto` (blocker filed), so an id dropped
 *  here is an id a farmer can never get back to. It is carried straight to
 *  the deal-done screen instead. */
type ActionResult =
  | { kind: 'accepted'; tx: TxDto }
  | { kind: 'rejected' }
  | { kind: 'countered'; offer: OfferDto };

export default function S14_CounterOffer({ navigation, route }: Props) {
  const offerId = route.params?.offer_id ?? fxIncomingOffer.id;

  const [locale, setLocale] = useState<Locale>('mr');
  React.useEffect(() => {
    getLocale().then(l => l && setLocale(l));
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['offers', offerId, 'withForecast'],
    queryFn: () => fetchOfferAndForecast(offerId),
  });

  const [counterPrice, setCounterPrice] = useState('');

  const {
    mutate: act,
    isPending: acting,
    isError: actFailed,
    isSuccess: acted,
    data: actionResult,
    reset: resetAct,
  } = useMutation({
    mutationFn: async (action: 'accept' | 'reject' | 'counter'): Promise<ActionResult> => {
      if (!data) throw new Error('no offer loaded');
      if (action === 'accept') {
        const tx = USE_FIXTURES
          ? { ...fxTx, offer_id: data.offer.id, qty_kg: data.offer.qty_kg }
          : await acceptOffer(data.offer.id);
        return { kind: 'accepted', tx };
      }
      if (action === 'reject') {
        if (!USE_FIXTURES) await rejectOffer(data.offer.id);
        return { kind: 'rejected' };
      }
      const price = Number(counterPrice);
      const countered = USE_FIXTURES
        ? { ...data.offer, id: `${data.offer.id}_c`, price_paise_per_qtl: price, round: data.offer.round + 1, initiator: 'FARMER' as const, parent_offer_id: data.offer.id }
        : await counterOffer(data.offer.id, { price_paise_per_qtl: price });
      return { kind: 'countered', offer: countered };
    },
  });

  if (isLoading) {
    return (
      <ScrollView contentContainerStyle={styles.root}>
        <Skeleton height={400} />
      </ScrollView>
    );
  }

  // P11: `error && !data`, not a bare `error` — same rule as S4/S7/S9. A
  // hydrated cache can hold this offer from an earlier session while a
  // background refetch on a dead network fails, and beat 9 is a farmer typing
  // a counter-price against a forecast. Shadowing a loaded offer with a retry
  // screen because a refetch failed would take the negotiation off the table
  // over a network blip. Only "nothing to negotiate against at all" is an error.
  if (error && !data) {
    return (
      <ErrorState message={translate('offer_fetch_error', locale)} onRetry={() => refetch()} />
    );
  }

  if (!data) {
    return <EmptyState title={translate('offer_not_found', locale)} />;
  }

  if (actFailed) {
    return (
      <ErrorState message={translate('offer_action_error', locale)} onRetry={() => resetAct()} />
    );
  }

  if (acting) {
    return (
      <ScrollView contentContainerStyle={styles.root}>
        <Skeleton height={120} />
      </ScrollView>
    );
  }

  if (acted && actionResult) {
    /* ★ Accepting is the one action that produces something to go and look
       at — a transaction, with escrow, a timeline and a settlement. It used
       to end at a one-line card here, which meant the `TxDto` the server
       had just returned was read once and dropped. It now opens the deal. */
    if (actionResult.kind === 'accepted') {
      const tx = actionResult.tx;
      return (
        <View style={styles.root}>
          <Card style={styles.resultCard}>
            <Text style={styles.resultText}>{translate('offer_accepted_message', locale)}</Text>
            <Button
              title={translate('offer_accepted_open_deal', locale)}
              onPress={() => navigation.navigate('S30_DealDone', { tx })}
            />
          </Card>
        </View>
      );
    }
    const message =
      actionResult.kind === 'rejected'
          ? translate('offer_rejected_message', locale)
          : translate('offer_countered_message', locale, {
              price: formatPaise(actionResult.offer.price_paise_per_qtl, locale),
              round: formatNumber(actionResult.offer.round, locale),
            });
    return (
      <View style={styles.root}>
        <Card style={styles.resultCard}>
          <Text style={styles.resultText}>{message}</Text>
        </Card>
      </View>
    );
  }

  const { offer, forecast } = data;
  const atLastRound = offer.round >= MAX_ROUND;
  const parsedCounter = Number(counterPrice);
  const canSubmitCounter =
    !atLastRound && counterPrice.trim().length > 0 && Number.isFinite(parsedCounter) && parsedCounter > 0;

  /* ★ This is the screen where the money is decided, and it had no speaker
     at all. It reads the offer, what the whole lot comes to at that rate,
     and — the part that matters — the forecast's floor beside its ceiling,
     so a farmer deciding whether to counter hears the downside in the same
     breath as the upside (I16, aloud). */
  const narration = [
    translate('offer_narr_round', locale, {
      round: formatNumber(offer.round, locale),
      max: formatNumber(MAX_ROUND, locale),
    }),
    translate('offer_narr_price', locale, {
      rate: formatPaise(offer.price_paise_per_qtl, locale),
      qty: formatQuintal(offer.qty_kg, locale),
      total: formatPaise(quintalValuePaise(offer.price_paise_per_qtl, offer.qty_kg), locale),
    }),
    ...(forecast.points.length > 0
      ? [
          translate('offer_narr_forecast', locale, {
            n: formatNumber(forecast.points.length, locale),
            floor: formatPaise(
              Math.min(...forecast.points.map(pt => pt.p10_paise_per_qtl)),
              locale,
            ),
            ceiling: formatPaise(
              Math.max(...forecast.points.map(pt => pt.p90_paise_per_qtl)),
              locale,
            ),
          }),
        ]
      : []),
    ...(atLastRound ? [translate('offer_narr_last_round', locale)] : []),
  ].join(' ');

  return (
    <ScrollView contentContainerStyle={styles.root}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>
          {translate('offer_round_header', locale, { round: formatNumber(offer.round, locale) })}
        </Text>
        <ListenButton text={narration} />
      </View>
      <Card style={styles.offerCard}>
        <Text style={styles.offerPrice}>
          {formatPaise(offer.price_paise_per_qtl, locale)} {translate('per_quintal_label', locale)}
        </Text>
        {/* I2: kg on the wire, quintals on screen, floored via `toQuintal` —
            same rule S15 and S16 already follow. The price above is per
            quintal, so a kg figure next to it invited a farmer to read the
            two against each other in different units. */}
        <Text style={styles.offerQty}>
          {translate('qty_label_value', locale, { qty: formatNumber(toQuintal(offer.qty_kg), locale) })}
        </Text>
        {(() => {
          const n = noteText(offer.note, (k, v) => translate(k, locale, v));
          return n ? <Text style={styles.offerNote}>{n}</Text> : null;
        })()}
      </Card>

      {/* The forecast, directly above the counter-price input — PRANAY.md
          §1.5. This ordering in the JSX is the feature, not a stray chart. */}
      <Text style={styles.sectionLabel}>
        {translate('your_forecast_label', locale, { days: formatNumber(DEFAULT_HORIZON_DAYS, locale) })}
      </Text>
      <ForecastFan
        p10={forecast.points.map(p => p.p10_paise_per_qtl)}
        p50={forecast.points.map(p => p.p50_paise_per_qtl)}
        p90={forecast.points.map(p => p.p90_paise_per_qtl)}
        locale={locale}
      />

      <Text style={styles.sectionLabel}>{translate('your_counter_price_label', locale)}</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder={translate('counter_price_placeholder', locale)}
        value={counterPrice}
        onChangeText={setCounterPrice}
        editable={!atLastRound}
      />
      {atLastRound ? (
        <Text style={styles.lastRoundNote}>{translate('last_round_note', locale)}</Text>
      ) : null}

      <View style={styles.actionRow}>
        <Button title={translate('accept_button', locale)} onPress={() => act('accept')} style={styles.actionButton} />
        <Button
          title={translate('counter_button', locale)}
          variant="outline"
          onPress={() => act('counter')}
          disabled={!canSubmitCounter}
          style={styles.actionButton}
        />
      </View>
      <Button
        title={translate('reject_button', locale)}
        variant="ghost"
        onPress={() => act('reject')}
        style={styles.rejectButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: space.md, paddingBottom: space.xxl, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    marginBottom: space.sm,
  },
  header: { ...typography.headlineSm, color: colors.onSurface, fontFamily: fontFamily.extraBold, flex: 1, minWidth: 0 },
  offerCard: { padding: 16, marginBottom: 20 },
  offerPrice: { ...typography.headlineMd, color: colors.tertiary, fontFamily: fontFamily.extraBold },
  offerQty: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 4 },
  offerNote: { ...typography.bodySm, color: colors.onSurface, marginTop: space.xs },
  sectionLabel: { ...typography.titleMd, color: colors.onSurface, marginTop: space.xs, marginBottom: space.xs },
  input: {
    borderWidth: 1.5,
    borderColor: colors.borderField,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 14,
    fontSize: 18,
    // Beat 9 is a farmer typing a counter-price. Without this the digits
    // he types are the platform default colour — white on a dark-mode phone.
    color: colors.onSurface,
    marginBottom: space.xs,
    backgroundColor: colors.surface,
  },
  lastRoundNote: { ...typography.bodySm, color: colors.critical, marginBottom: space.sm },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionButton: { flex: 1 },
  rejectButton: { marginTop: 12 },
  resultCard: { padding: 24, alignItems: 'center' },
  resultText: { ...typography.bodyLg, color: colors.onSurface, textAlign: 'center' },
});
