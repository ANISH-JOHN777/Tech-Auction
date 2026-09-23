import { useState, useEffect } from 'react';
import { socket, connectSocket, joinAuctionRoom } from '../services/socket';
import { api } from '../services/api';

export function useAuction(challenge, teamId) {
  const [roomState, setRoomState] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [bidding, setBidding] = useState(false);
  const [error, setError] = useState('');
  const [bidHistory, setBidHistory] = useState([]);

  async function loadInitialData() {
    if (!challenge) return;
    try {
      const roomData = await api.getAuction(challenge);
      setRoomState(roomData);
      if (roomData.bidHistory) {
        setBidHistory(roomData.bidHistory);
      }

      if (teamId) {
        const wData = await api.getWallet();
        setWallet(wData.wallet);
        setTransactions(wData.transactions);
      }
    } catch (err) {
      console.warn('Failed to load initial auction state:', err.message);
    }
  }

  useEffect(() => {
    if (!challenge) return;

    connectSocket();
    joinAuctionRoom(challenge);
    loadInitialData();

    function handleRoomUpdate(data) {
      setRoomState(data);
      if (data.bidHistory) {
        setBidHistory(data.bidHistory);
      }
    }

    function handleBidPlaced(data) {
      setRoomState(data);
      if (data.bidHistory) {
        setBidHistory(data.bidHistory);
      }
    }

    function handleWalletUpdated(data) {
      if (teamId && data.teamId === teamId) {
        setWallet(data.wallet);
        api.getWallet().then((wData) => {
          setWallet(wData.wallet);
          setTransactions(wData.transactions);
        });
      }
    }

    function handleBidRejected(data) {
      setError(data.error || 'Bid rejected by server.');
    }

    socket.on('auction:room-state', handleRoomUpdate);
    socket.on('auction:item-started', handleRoomUpdate);
    socket.on('auction:bid-placed', handleBidPlaced);
    socket.on('auction:item-ended', handleRoomUpdate);
    socket.on('auction:item-sold', handleRoomUpdate);
    socket.on('auction:wallet-updated', handleWalletUpdated);
    socket.on('auction:bid-rejected', handleBidRejected);

    return () => {
      socket.off('auction:room-state', handleRoomUpdate);
      socket.off('auction:item-started', handleRoomUpdate);
      socket.off('auction:bid-placed', handleBidPlaced);
      socket.off('auction:item-ended', handleRoomUpdate);
      socket.off('auction:item-sold', handleRoomUpdate);
      socket.off('auction:wallet-updated', handleWalletUpdated);
      socket.off('auction:bid-rejected', handleBidRejected);
    };
  }, [challenge, teamId]);

  async function placeBid(amount) {
    setError('');
    setBidding(true);
    try {
      const data = await api.placeBid(amount);
      setRoomState(data.roomState);
      setWallet(data.wallet);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setBidding(false);
    }
  }

  return {
    roomState,
    wallet,
    transactions,
    bidding,
    error,
    bidHistory,
    placeBid,
    refreshState: loadInitialData,
  };
}
