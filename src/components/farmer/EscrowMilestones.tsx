/**
 * The four checkpoints a deal passes after it is agreed, as a strip.
 *
 * ★ This is Stitch 31's progress row — "एस्क्रो · शेतवजन · गाडी रवाना ·
 *   बँक वर्ग" — and the reason it matters is the question a farmer asks the
 *   moment he accepts: *what happens now?* The deals list was answering
 *   "opening its later record is still being built", which is a developer's
 *   answer to a farmer's question.
 *
 * ★ The four stages are CANON §7.7's own escrow FSM, not a set invented for
 *   the picture: `ESCROW_HELD → DISPATCHED → DELIVERED → RELEASED`. A stage
 *   reads done when the transaction has reached it *or anything after it*,
 *   so the ticks come from the status rather than from a hardcoded flag.
 *
 * ★ `DISPUTED`, `REFUNDED` and `CANCELLED` are deliberately not stages. They
 *   are exits from the happy path, not points along it, and drawing them as
 *   a fifth and sixth checkpoint would suggest every deal passes through
 *   them. When a transaction is in one of those states the strip says so in
 *   one line instead of pretending the march is still on.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radius, space, type as typography } from '../../theme/tokens';
import { Icon } from '../ui/Icon';
import { useT } from '../../lib/i18n';
import type { TxStatus } from '../../types/api';

/** In FSM order. `reachedBy` lists every status at or past that stage. */
const STAGES: Array<{
  key: string;
  icon: Parameters<typeof Icon>[0]['name'];
  reachedBy: TxStatus[];
}> = [
  {
    key: 'em_escrow',
    icon: 'lock',
    reachedBy: ['ESCROW_HELD', 'DISPATCHED', 'DELIVERED', 'RELEASED'],
  },
  { key: 'em_dispatched', icon: 'truck', reachedBy: ['DISPATCHED', 'DELIVERED', 'RELEASED'] },
  { key: 'em_delivered', icon: 'building', reachedBy: ['DELIVERED', 'RELEASED'] },
  { key: 'em_released', icon: 'check-circle', reachedBy: ['RELEASED'] },
];

/** The states that leave the happy path rather than sitting on it. */
const OFF_PATH: TxStatus[] = ['DISPUTED', 'REFUNDED', 'CANCELLED'];

export function EscrowMilestones({ status }: { status: TxStatus }) {
  const { t } = useT();

  if (OFF_PATH.includes(status)) {
    return (
      <View style={styles.offPath}>
        <Icon name="info" size={14} color={colors.onCriticalContainer} />
        <Text style={styles.offPathText}>{t(`em_off_${status.toLowerCase()}`)}</Text>
      </View>
    );
  }

  const doneCount = STAGES.filter(s => s.reachedBy.includes(status)).length;

  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        {STAGES.map((stage, i) => {
          const done = stage.reachedBy.includes(status);
          /* The stage immediately after the last completed one is where the
             deal actually is — worth marking, so a farmer can see what he is
             waiting for rather than only what has happened. */
          const current = !done && i === doneCount;
          return (
            <View key={stage.key} style={styles.stage}>
              <View style={styles.stageTop}>
                <View
                  style={[
                    styles.dot,
                    done && styles.dotDone,
                    current && styles.dotCurrent,
                  ]}>
                  <Icon
                    name={done ? 'check' : stage.icon}
                    size={11}
                    color={done ? colors.onPrimary : current ? colors.primary : colors.outline}
                  />
                </View>
                {i < STAGES.length - 1 ? (
                  <View style={[styles.rail, done && styles.railDone]} />
                ) : null}
              </View>
              <Text
                style={[
                  styles.stageLabel,
                  done && styles.stageLabelDone,
                  current && styles.stageLabelCurrent,
                ]}
                numberOfLines={2}>
                {t(stage.key)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  track: { flexDirection: 'row', alignItems: 'flex-start' },
  stage: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  stageTop: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dotDone: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  dotCurrent: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.surface },
  rail: { flex: 1, height: 2, backgroundColor: colors.outlineVariant },
  railDone: { backgroundColor: colors.primaryContainer },
  stageLabel: {
    ...typography.labelSm,
    fontSize: 10,
    lineHeight: 13,
    color: colors.outline,
    marginTop: 4,
    paddingRight: 4,
  },
  stageLabelDone: { color: colors.onSurfaceVariant },
  stageLabelCurrent: { color: colors.primary, fontFamily: fontFamily.bold },

  offPath: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: space.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.criticalContainer,
  },
  offPathText: { ...typography.labelSm, color: colors.onCriticalContainer, flex: 1 },
});
