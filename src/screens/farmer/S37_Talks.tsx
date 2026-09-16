/**
 * The farmer's Talks tab — the negotiation inbox, as a footer tab.
 *
 * ★ Reaching a buyer used to mean lot -> buyers list -> buyer profile ->
 *   bargaining, four screens deep and only from inside the selling flow.
 *   Nothing anywhere answered "who is talking to me right now?". This is a
 *   tab, one tap from everywhere.
 *
 * ★ The list itself is `shared/TalksList` because the farmer and the buyer
 *   are two ends of one conversation. Building each side its own screen is
 *   exactly how they would drift apart.
 */

import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { TalksList } from '../shared/TalksList';
import type { TalksStackParamList } from '../../navigation/FarmerTabs';

type Props = NativeStackScreenProps<TalksStackParamList, 'S37_Talks'>;

export default function S37_Talks({ navigation }: Props) {
  return (
    <TalksList
      viewerRole="FARMER"
      /* ★ Opens the Stitch bargaining screen (S27), not the plain counter
         layout. Tapping "waiting for your reply" should land on the audit
         trail and the three moves, which is what the design draws. */
      onOpenThread={offer => navigation.navigate('S27_Bargaining', { offer_id: offer.id })}
    />
  );
}
