import React from 'react';
import AuctionPanel from '../components/AuctionPanel';
import BidHistory from '../components/BidHistory';
import WalletTransactions from '../components/WalletTransactions';
import PurchasedAdvantages from '../components/PurchasedAdvantages';
import AIAssist from '../components/AIAssist';
import { useAuction } from '../hooks/useAuction';

export default function Auction({ challenge, team }) {
  const { roomState, wallet, transactions, bidding, error, bidHistory, placeBid } = useAuction(challenge, team?.id);

  return (
    <div className="space-y-6">
      <AuctionPanel
        challenge={challenge}
        roomState={roomState}
        wallet={wallet}
        onBid={placeBid}
        bidding={bidding}
        error={error}
      />

      <PurchasedAdvantages wallet={wallet} team={team} />

      <AIAssist />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BidHistory history={bidHistory} />
        <WalletTransactions wallet={wallet} transactions={transactions} />
      </div>
    </div>
  );
}
