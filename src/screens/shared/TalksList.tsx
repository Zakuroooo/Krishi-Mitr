/**
 * Talks — the negotiation inbox, shared by the farmer and the buyer.
 * Built to the Stitch "तुमच्या चर्चा" screen.
 *
 * ★ Why this screen exists: reaching a counterparty used to mean walking
 *   lot -> buyers list -> buyer profile -> bargaining, four screens deep, and
 *   only from the selling flow. There was no one place that answered "who is
 *   talking to me right now?". This is that place, and it is a tab on both
 *   sides.
 *
 * ★ Why it is not a free-text messenger: there is no chat endpoint. What the
 *   backend does have is the thing that actually matters — `GET /offers/{id}
 *   /thread` returns the whole back-and-forth, each round carrying a price
 *   and an optional `note`. The note is the message, and the conversation in
 *   this product is the offer thread.
 *
 * ★ Symmetric by construction. `viewerRole` decides only which side of the
 *   conversation is labelled "you", so the two sides cannot drift apart the
 *   way two separately-built screens would.
 *
 * ── What the mockup shows that this screen does not, and why ────────────
 *
 * ★ The buyer's name, licence number ("लायसन्स क्र. LSL-884"), star rating
 *   and photograph. `OfferDto` carries `buyer_id` and nothing else, and
 *   CANON exposes no `GET /buyers/{id}` (blocker filed). Inventing a licence
 *   number is worse than inventing a company name: it reads as a credential
 *   issued by a market committee. `on_time_payment_bps` also *defaults to
 *   10000* in the schema, so a rating rendered from that column would assert
 *   a perfect record for a buyer nobody has transacted with.
 *   TODO(akash): the buyer block slots straight in once that lands.
 *
 * ★ "मंडी एस्क्रो खात्री — सुरक्षित शेतकरी पेमेंट लॉक". The escrow FSM is
 *   real and CANON has it; a *guarantee* is not ours to give, and this app is
 *   authorised by no market committee. The strip states the mechanism
 *   instead, which is true and is the part a farmer needs.
 *
 * ★ "शेतकरी क्र. ४०८" under the farmer's name — there is no farmer number in
 *   the contract.
 *
 * ★ ZERO EMOJIS. ★ Loading, empty, error and data all render.
 */

import React, { useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { colors, fontFamily, radius, space, type as typography } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { ListenButton } from '../../components/ui/ListenButton';
import { useT } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { noteText } from '../../lib/offerNote';
import { formatNumber, formatPaise, formatQuintal, quintalValuePaise } from '../../lib/money';
import { formatTimeRemaining } from '../../lib/dates';
import { getOffers } from '../../lib/api';
import { USE_FIXTURES } from '../../config';
import { fxMyOffers } from '../../fixtures/offers';
import { ErrorState, Skeleton } from '../../components/farmer/States';
import type { OfferDto, OfferStatus, Role } from '../../types/api';

const MAX_ROUND = 3;

const STATUS_KEY: Record<OfferStatus, string> = {
  OPEN: 'chat_status_open',
  ACCEPTED: 'chat_status_accepted',
  REJECTED: 'chat_status_rejected',
  EXPIRED: 'chat_status_expired',
  COUNTERED: 'chat_status_countered',
  WITHDRAWN: 'chat_status_withdrawn',
};

/** The mockup's four chips. Every one is derivable from the offer itself —
 * no filter here needs a field the contract does not have. */
type Filter = 'all' | 'yours' | 'theirs' | 'new';

async function fetchOffers(): Promise<OfferDto[]> {
  if (USE_FIXTURES) return fxMyOffers;
  return getOffers();
}

export function TalksList({
  viewerRole,
  onOpenThread,
}: {
  viewerRole: Role;
  /** Where a tapped talk goes. The two sides own different thread screens, so
   * this stays a callback rather than this component reaching for a navigator
   * it would have to branch on. */
  onOpenThread: (offer: OfferDto) => void;
}) {
  const { t, locale } = useT();
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['offers', 'talks'],
    queryFn: fetchOffers,
  });

  const offers = useMemo(() => data ?? [], [data]);

  /** Waiting on the viewer: the other side moved last and it is still open. */
  const isWaitingOnViewer = (o: OfferDto) => o.initiator !== viewerRole && o.status === 'OPEN';

  const waiting = offers.filter(isWaitingOnViewer);
  const withThem = offers.filter(o => o.status === 'OPEN' && !isWaitingOnViewer(o));
  const fresh = offers.filter(o => o.status === 'OPEN' && o.round === 1);

  const shown = useMemo(() => {
    const list =
      filter === 'yours'
        ? waiting
        : filter === 'theirs'
          ? withThem
          : filter === 'new'
            ? fresh
            : offers;
    // Whatever is waiting on the farmer comes first — the screen's whole job
    // is answering "what needs me?".
    return [...list].sort((a, b) => {
      const aw = isWaitingOnViewer(a) ? 0 : 1;
      const bw = isWaitingOnViewer(b) ? 0 : 1;
      if (aw !== bw) return aw - bw;
      return b.created_at.localeCompare(a.created_at);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offers, filter, viewerRole]);

  /** What every live offer would pay if each were accepted, and on how much
   * produce. Both are sums over real offers. */
  const openOffers = offers.filter(o => o.status === 'OPEN');
  const liveTotal = openOffers.reduce(
    (sum, o) => sum + quintalValuePaise(o.price_paise_per_qtl, o.qty_kg),
    0,
  );
  const liveKg = openOffers.reduce((sum, o) => sum + o.qty_kg, 0);

  const narration =
    offers.length === 0
      ? t('chat_empty_title')
      : [
          t('chat_narr_count', { n: formatNumber(offers.length, locale) }),
          ...shown.map(o =>
            t(isWaitingOnViewer(o) ? 'chat_narr_waiting_you' : 'chat_narr_waiting_them', {
              rate: formatPaise(o.price_paise_per_qtl, locale),
              qty: formatQuintal(o.qty_kg, locale),
            }),
          ),
        ].join(' ');

  const FILTERS: Array<{ key: Filter; labelKey: string; count: number }> = [
    { key: 'all', labelKey: 'chat_filter_all', count: offers.length },
    { key: 'yours', labelKey: 'chat_filter_yours', count: waiting.length },
    { key: 'theirs', labelKey: 'chat_filter_theirs', count: withThem.length },
    { key: 'new', labelKey: 'chat_filter_new', count: fresh.length },
  ];

  // ── The header block, present in every state ──────────────────────────
  const header = (
    <View style={styles.header}>
      {/* The mockup puts a photograph here. `User` has no avatar field, so
          this is the farmer's own initial rather than a stock face. */}
      <View style={styles.avatarRing}>
        <Text style={styles.avatarInitial}>{(user?.name ?? '').trim().slice(0, 1) || '—'}</Text>
      </View>
      <View style={styles.headerText}>
        <Text style={styles.headerName} numberOfLines={1}>
          {user?.name ?? t('chat_title')}
        </Text>
        <Text style={styles.headerSub} numberOfLines={1}>
          {t('home_market_name')}
        </Text>
      </View>
      <ListenButton text={narration} />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {header}
        <View style={styles.scroll}>
          <Skeleton height={96} />
          <View style={{ height: space.sm }} />
          <Skeleton height={210} />
        </View>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {header}
        <ErrorState message={t('offers_fetch_error')} onRetry={() => refetch()} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      {header}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Title row ───────────────────────────────────────────────── */}
        <View style={styles.titleRow}>
          <View style={styles.titleText}>
            <Text style={styles.title}>{t('chat_title')}</Text>
            <Text style={styles.titleSub}>{t('chat_subtitle')}</Text>
          </View>
          {openOffers.length > 0 ? (
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.livePillText}>
                {t('chat_active_rounds', { n: formatNumber(openOffers.length, locale) })}
              </Text>
            </View>
          ) : null}
        </View>

        {offers.length > 0 ? (
          <>
            {/* ── What is on the table ────────────────────────────────── */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View style={styles.summaryLeft}>
                  <Text style={styles.summaryLabel}>{t('chat_summary_label')}</Text>
                  <Text style={styles.summaryValue}>{formatPaise(liveTotal, locale)}</Text>
                </View>
                <View style={styles.summaryChip}>
                  <Text style={styles.summaryChipText}>
                    {t('chat_summary_count', { n: formatNumber(waiting.length, locale) })}
                  </Text>
                </View>
              </View>
              <Text style={styles.summaryMeta}>
                {t('chat_summary_meta', { qty: formatQuintal(liveKg, locale) })}
              </Text>

              {/* ★ The mockup's "मंडी एस्क्रो खात्री" guarantee, restated as
                  the mechanism CANON actually implements. */}
              <View style={styles.escrowStrip}>
                <Icon name="shield-check" size={15} color={colors.tertiary} />
                <Text style={styles.escrowText}>{t('chat_escrow_note')}</Text>
              </View>
            </View>

            {/* ── Filters ─────────────────────────────────────────────── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}>
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterChip, filter === f.key && styles.filterChipOn]}
                  onPress={() => setFilter(f.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === f.key }}>
                  <Text style={[styles.filterText, filter === f.key && styles.filterTextOn]}>
                    {t(f.labelKey, { n: formatNumber(f.count, locale) })}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        ) : null}

        {shown.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Icon name="message-circle" size={26} color={colors.outline} />
            </View>
            <Text style={styles.emptyTitle}>{t('chat_empty_title')}</Text>
            <Text style={styles.emptyBody}>
              {viewerRole === 'BUYER' ? t('chat_empty_body_buyer') : t('chat_empty_body')}
            </Text>
          </View>
        ) : null}

        {shown.map((offer, i) => {
          const waitingOnViewer = isWaitingOnViewer(offer);
          const live = offer.status === 'OPEN';
          const note = noteText(offer.note, t);
          const total = quintalValuePaise(offer.price_paise_per_qtl, offer.qty_kg);
          const atLastRound = offer.round >= MAX_ROUND;
          const timeLeft = live ? formatTimeRemaining(offer.expires_at, locale, t) : null;

          /* ★ The mockup's "+₹७० वाढीव मागणी" chip. This one IS computable:
             it is this round against the previous one on the same lot. With
             no earlier round to compare, the chip is simply absent rather
             than showing a zero that would read as "no movement". */
          const previous = shown
            .slice(i + 1)
            .find(p => p.lots[0]?.lot_id === offer.lots[0]?.lot_id);
          const move = previous
            ? offer.price_paise_per_qtl - previous.price_paise_per_qtl
            : null;

          return (
            <View key={offer.id} style={[styles.card, waitingOnViewer && styles.cardWaiting]}>
              {/* ── Round band ───────────────────────────────────────── */}
              <View style={[styles.band, waitingOnViewer && styles.bandWaiting]}>
                <Icon
                  name={waitingOnViewer ? 'zap' : live ? 'clock' : 'check-circle'}
                  size={13}
                  color={waitingOnViewer ? colors.onPrimary : colors.onSurfaceVariant}
                />
                <Text style={[styles.bandText, waitingOnViewer && styles.bandTextOn]}>
                  {t('chat_round_of', {
                    round: formatNumber(offer.round, locale),
                    max: formatNumber(MAX_ROUND, locale),
                  })}
                  {atLastRound && live ? ` · ${t('chat_final_round')}` : ''}
                </Text>
                <View style={[styles.bandChip, waitingOnViewer && styles.bandChipOn]}>
                  <Text style={[styles.bandChipText, waitingOnViewer && styles.bandChipTextOn]}>
                    {live
                      ? waitingOnViewer
                        ? t('chat_action_decide')
                        : t('chat_action_with_buyer')
                      : t(STATUS_KEY[offer.status])}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                {/* ── Who, and which lot ────────────────────────────── */}
                <View style={styles.whoRow}>
                  <View style={styles.whoAvatar}>
                    <Icon
                      name={offer.initiator === 'BUYER' ? 'building' : 'leaf'}
                      size={17}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.whoText}>
                    <Text style={styles.whoName}>
                      {offer.initiator === 'BUYER' ? t('chat_from_buyer') : t('chat_from_you')}
                    </Text>
                    {/* ★ Where the mockup's licence number and star rating
                        sit. Neither exists in the contract — see the file
                        header — so this line carries what does. */}
                    <Text style={styles.whoMeta}>{t(STATUS_KEY[offer.status])}</Text>
                  </View>
                  <View style={styles.lotCol}>
                    <Text style={styles.lotLabel}>{t('chat_lot_label')}</Text>
                    <Text style={styles.lotValue}>
                      {t('chat_qty', { qty: formatQuintal(offer.qty_kg, locale) })}
                    </Text>
                  </View>
                </View>

                {/* ── The figures panel ─────────────────────────────── */}
                <View style={styles.figures}>
                  <View style={styles.figureCol}>
                    <Text style={styles.figureLabel}>{t('chat_rate_label')}</Text>
                    <View style={styles.figureLine}>
                      <Text style={styles.figureValue}>
                        {formatPaise(offer.price_paise_per_qtl, locale)}
                      </Text>
                      <Text style={styles.figureUnit}>{t('bg_per_qtl')}</Text>
                    </View>
                    {move !== null && move !== 0 ? (
                      <View style={[styles.moveChip, move < 0 && styles.moveChipDown]}>
                        <Icon
                          name={move > 0 ? 'trending-up' : 'trending-down'}
                          size={11}
                          color={move > 0 ? colors.onPositiveContainer : colors.onCriticalContainer}
                        />
                        <Text style={[styles.moveChipText, move < 0 && styles.moveChipTextDown]}>
                          {move > 0 ? '+' : '−'}
                          {formatPaise(Math.abs(move), locale)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.figureDivider} />
                  <View style={styles.figureColRight}>
                    <Text style={styles.figureLabel}>{t('chat_total_label')}</Text>
                    <Text style={[styles.figureValue, styles.figureTotal]}>
                      {formatPaise(total, locale)}
                    </Text>
                    <Text style={styles.figureNote}>
                      {t('chat_total_note', { qty: formatQuintal(offer.qty_kg, locale) })}
                    </Text>
                  </View>
                </View>

                {/* The note is the message — the only free text this channel
                    carries, and the reason a thread reads as a conversation. */}
                {note ? (
                  <View style={styles.quoteBox}>
                    <Text style={styles.quoteMark}>&#8220;</Text>
                    <Text style={styles.quoteText} numberOfLines={3}>
                      {note}
                    </Text>
                  </View>
                ) : null}

                {/* ── Footer: what is left, and the way in ──────────── */}
                <View style={styles.cardFoot}>
                  <View style={styles.footLeft}>
                    <Icon
                      name={
                        timeLeft ? 'clock' : offer.status === 'ACCEPTED' ? 'check-circle' : 'info'
                      }
                      size={13}
                      color={
                        timeLeft && waitingOnViewer
                          ? colors.primary
                          : offer.status === 'ACCEPTED'
                            ? colors.tertiary
                            : colors.onSurfaceVariant
                      }
                    />
                    <Text
                      style={[
                        styles.footText,
                        timeLeft && waitingOnViewer && styles.footTextUrgent,
                        offer.status === 'ACCEPTED' && styles.footTextDone,
                      ]}
                      numberOfLines={1}>
                      {/* ★ A real countdown off `expires_at`, not the mockup's
                          fixed "५ तास २४ मिनिटे". Once it has passed there is
                          no time left to report, and the line says where the
                          offer stands instead. */}
                      {timeLeft
                        ? t('chat_time_left', { time: timeLeft })
                        : live
                          ? waitingOnViewer
                            ? t('chat_awaiting_you')
                            : t('chat_awaiting_them')
                          : t(`chat_ended_${offer.status.toLowerCase()}`)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.openBtn, waitingOnViewer && styles.openBtnPrimary]}
                    onPress={() => onOpenThread(offer)}
                    accessibilityRole="button">
                    <Text style={[styles.openText, waitingOnViewer && styles.openTextOn]}>
                      {t('chat_open')}
                    </Text>
                    <Icon
                      name="arrow-right"
                      size={15}
                      color={waitingOnViewer ? colors.onPrimary : colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
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
  avatarRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primaryContainer,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.primary,
  },
  headerText: { flex: 1, minWidth: 0 },
  headerName: { ...typography.titleLg, color: colors.onSurface, fontFamily: fontFamily.extraBold },
  headerSub: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontFamily: fontFamily.medium,
  },

  scroll: { padding: space.md, paddingBottom: space.xxl, gap: space.sm },

  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  titleText: { flex: 1, minWidth: 0 },
  title: { ...typography.displayLg, color: colors.primary },
  titleSub: { ...typography.bodySm, color: colors.onSurfaceVariant, lineHeight: 18 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.positiveContainer,
    flexShrink: 0,
    marginTop: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.tertiary },
  livePillText: {
    ...typography.labelSm,
    color: colors.onPositiveContainer,
    fontFamily: fontFamily.bold,
  },

  summaryCard: {
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    gap: space.xs,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  summaryLeft: { flex: 1, minWidth: 0 },
  summaryLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  summaryValue: {
    fontFamily: fontFamily.extraBold,
    fontSize: 30,
    lineHeight: 40,
    color: colors.primary,
  },
  summaryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primaryContainer,
    flexShrink: 0,
  },
  summaryChipText: { ...typography.labelSm, color: colors.onPrimary, fontFamily: fontFamily.bold },
  summaryMeta: { ...typography.labelSm, color: colors.onSurfaceVariant },
  escrowStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
  },
  escrowText: { ...typography.labelSm, color: colors.onSurfaceVariant, flex: 1, lineHeight: 16 },

  filterRow: { gap: space.xs, paddingVertical: 2 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  filterChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { ...typography.labelMd, color: colors.onSurfaceVariant },
  filterTextOn: { color: colors.onPrimary, fontFamily: fontFamily.extraBold },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    overflow: 'hidden',
  },
  cardWaiting: { borderWidth: 2, borderColor: colors.primaryContainer },

  band: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: 8,
    backgroundColor: colors.surfaceContainer,
  },
  bandWaiting: { backgroundColor: colors.primaryContainer },
  bandText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontFamily: fontFamily.bold,
    flex: 1,
  },
  bandTextOn: { color: colors.onPrimary },
  bandChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  bandChipOn: { borderColor: colors.onPrimary },
  bandChipText: { ...typography.labelSm, color: colors.onSurfaceVariant },
  bandChipTextOn: { color: colors.onPrimary, fontFamily: fontFamily.bold },

  cardBody: { padding: space.md, gap: space.sm },

  whoRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  whoAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whoText: { flex: 1, minWidth: 0 },
  whoName: { ...typography.titleMd, color: colors.onSurface, fontFamily: fontFamily.bold },
  whoMeta: { ...typography.labelSm, color: colors.onSurfaceVariant },
  lotCol: { alignItems: 'flex-end', flexShrink: 0 },
  lotLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  lotValue: { ...typography.labelMd, color: colors.onSurface, fontFamily: fontFamily.bold },

  figures: {
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
  },
  figureCol: { flex: 1, minWidth: 0, gap: 2 },
  figureColRight: { flex: 1, minWidth: 0, gap: 2, alignItems: 'flex-end' },
  figureDivider: { width: 1, backgroundColor: colors.outlineVariant, marginHorizontal: space.sm },
  figureLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  /* Sibling Texts and an explicit lineHeight — a nested smaller <Text> takes
     over the line box on Android and shears the top off the number. */
  figureLine: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  figureValue: {
    fontFamily: fontFamily.extraBold,
    fontSize: 20,
    lineHeight: 28,
    color: colors.onSurface,
  },
  figureUnit: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontFamily: fontFamily.medium,
  },
  figureTotal: { color: colors.primary },
  figureNote: { ...typography.labelSm, color: colors.onSurfaceVariant, textAlign: 'right' },

  moveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.positiveContainer,
  },
  moveChipDown: { backgroundColor: colors.criticalContainer },
  moveChipText: {
    ...typography.labelSm,
    color: colors.onPositiveContainer,
    fontFamily: fontFamily.bold,
  },
  moveChipTextDown: { color: colors.onCriticalContainer },

  quoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
  },
  quoteMark: {
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
    lineHeight: 20,
    color: colors.primaryContainer,
  },
  quoteText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 19,
    fontStyle: 'italic',
  },

  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.xs,
    paddingTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  footLeft: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 },
  footText: { ...typography.labelSm, color: colors.onSurfaceVariant, flexShrink: 1 },
  footTextUrgent: { color: colors.primary, fontFamily: fontFamily.bold },
  footTextDone: { color: colors.tertiary, fontFamily: fontFamily.bold },

  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHigh,
    flexShrink: 0,
  },
  openBtnPrimary: { backgroundColor: colors.primary },
  openText: { ...typography.labelMd, color: colors.primary, fontFamily: fontFamily.bold },
  openTextOn: { color: colors.onPrimary, fontFamily: fontFamily.extraBold },

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
});
