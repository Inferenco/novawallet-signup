// Nova Wallet - Daily Free Chips Hook
// Handles daily free chip claim state and actions

import { useCallback, useEffect, useState } from 'react';
import type { GameSigner } from "../../types";
import type { NetworkType } from '../../utils/constants';
import { claimFreeChips } from '../../services/poker/actions';
import {
    getDailyFreeAmount,
    getLastClaimTime,
    getMultiplierStatus,
    getFreeClaimPeriodSeconds,
    canClaimFreeChips,
    getTimeUntilNextClaim,
} from '../../services/poker/chips';
import { parsePokerError } from '../../utils/poker/errors';

interface UseFreeChipsOptions {
    network: NetworkType;
    playerAddress: string;
}

interface UseFreeChipsReturn {
    dailyAmount: number;
    boostedDailyAmount: number;
    lastClaimTime: number;
    canClaim: boolean;
    timeUntilNext: number;
    multiplierFactor: number;
    multiplierStartedAt: number;
    multiplierExpiresAt: number;
    multiplierTimeLeft: number;
    isClaiming: boolean;
    error: string | null;
    doClaimFreeChips: (account: GameSigner) => Promise<boolean>;
    refreshClaimStatus: () => Promise<void>;
    clearError: () => void;
}

export function useFreeChips({
    network,
    playerAddress,
}: UseFreeChipsOptions): UseFreeChipsReturn {
    const [dailyAmount, setDailyAmount] = useState(0);
    const [lastClaimTime, setLastClaimTime] = useState(0);
    const [canClaim, setCanClaim] = useState(false);
    const [timeUntilNext, setTimeUntilNext] = useState(0);
    const [isClaiming, setIsClaiming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [multiplierFactor, setMultiplierFactor] = useState(1);
    const [multiplierStartedAt, setMultiplierStartedAt] = useState(0);
    const [multiplierExpiresAt, setMultiplierExpiresAt] = useState(0);
    const [multiplierTimeLeft, setMultiplierTimeLeft] = useState(0);
    const [boostedDailyAmount, setBoostedDailyAmount] = useState(0);
    const [claimPeriodSeconds, setClaimPeriodSeconds] = useState(10800); // Default: 3 hours

    const refreshClaimStatus = useCallback(async () => {
        if (!network || !playerAddress) return;
        try {
            const [amount, lastTime, multiplierStatus, periodSeconds] = await Promise.all([
                getDailyFreeAmount(network),
                getLastClaimTime(network, playerAddress),
                getMultiplierStatus(network, playerAddress),
                getFreeClaimPeriodSeconds(network),
            ]);
            const eligible = canClaimFreeChips(lastTime, periodSeconds);
            const now = Math.floor(Date.now() / 1000);
            const isActive = multiplierStatus.factor > 1 && multiplierStatus.expiresAt > now;
            const timeLeft = isActive ? multiplierStatus.expiresAt - now : 0;
            setDailyAmount(amount);
            setLastClaimTime(lastTime);
            setCanClaim(eligible);
            setTimeUntilNext(getTimeUntilNextClaim(lastTime, periodSeconds));
            setMultiplierFactor(isActive ? multiplierStatus.factor : 1);
            setMultiplierStartedAt(isActive ? multiplierStatus.startedAt : 0);
            setMultiplierExpiresAt(isActive ? multiplierStatus.expiresAt : 0);
            setMultiplierTimeLeft(timeLeft);
            setBoostedDailyAmount(amount * (isActive ? multiplierStatus.factor : 1));
            setClaimPeriodSeconds(periodSeconds);
        } catch (err) {
            console.error('Failed to refresh free chips status:', err);
        }
    }, [network, playerAddress]);

    useEffect(() => {
        refreshClaimStatus();
    }, [refreshClaimStatus]);

    const doClaimFreeChips = useCallback(async (account: GameSigner): Promise<boolean> => {
        if (isClaiming) return false;
        const eligibleNow = canClaim || canClaimFreeChips(lastClaimTime, claimPeriodSeconds);
        if (!eligibleNow) {
            setError('Free claim not available yet');
            return false;
        }

        try {
            setIsClaiming(true);
            setError(null);
            if (!canClaim) {
                setCanClaim(true);
                setTimeUntilNext(0);
            }
            const result = await claimFreeChips(network, account);
            if (result.success) {
                await refreshClaimStatus();
                return true;
            }
            setError('Transaction failed');
            return false;
        } catch (err) {
            const message = parsePokerError(err);
            setError(message);
            return false;
        } finally {
            setIsClaiming(false);
        }
    }, [isClaiming, canClaim, lastClaimTime, claimPeriodSeconds, network, refreshClaimStatus]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        dailyAmount,
        boostedDailyAmount,
        lastClaimTime,
        canClaim,
        timeUntilNext,
        multiplierFactor,
        multiplierStartedAt,
        multiplierExpiresAt,
        multiplierTimeLeft,
        isClaiming,
        error,
        doClaimFreeChips,
        refreshClaimStatus,
        clearError,
    };
}

export default useFreeChips;
