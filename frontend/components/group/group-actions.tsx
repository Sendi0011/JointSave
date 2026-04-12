"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowUpRight, ArrowDownLeft, AlertCircle } from "lucide-react"
import { useStellar } from "@/components/web3-provider"
import {
  useRotationalDeposit,
  useTargetContribute,
  useTargetWithdraw,
  useFlexibleDeposit,
  useFlexibleWithdraw,
} from "@/hooks/useJointSaveContracts"

interface GroupActionsProps {
  groupId: string
  poolAddress: string
  poolType: "rotational" | "target" | "flexible"
  tokenAddress: string
}

export function GroupActions({ groupId, poolAddress, poolType }: GroupActionsProps) {
  const { address } = useStellar()
  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [error, setError] = useState("")

  const rotationalDeposit = useRotationalDeposit(poolAddress)
  const targetContribute = useTargetContribute(poolAddress, depositAmount)
  const targetWithdraw = useTargetWithdraw(poolAddress)
  const flexibleDeposit = useFlexibleDeposit(poolAddress, depositAmount)
  const flexibleWithdraw = useFlexibleWithdraw(poolAddress, withdrawAmount)

  const isPending = poolAddress === "pending_deployment"

  const handleDeposit = async () => {
    setError("")
    if (!address) return setError("Please connect your wallet first")
    if (isPending) return setError("Contract not yet deployed. Deploy via Stellar CLI first.")
    try {
      if (poolType === "rotational") await rotationalDeposit.deposit()
      else if (poolType === "target") await targetContribute.contribute()
      else await flexibleDeposit.deposit()
    } catch (e: any) {
      setError(e.message || "Transaction failed")
    }
  }

  const handleWithdraw = async () => {
    setError("")
    if (!address) return setError("Please connect your wallet first")
    if (isPending) return setError("Contract not yet deployed.")
    try {
      if (poolType === "target") await targetWithdraw.withdraw()
      else await flexibleWithdraw.withdraw()
    } catch (e: any) {
      setError(e.message || "Transaction failed")
    }
  }

  const isDepositLoading =
    poolType === "rotational"
      ? rotationalDeposit.isLoading
      : poolType === "target"
        ? targetContribute.isLoading
        : flexibleDeposit.isLoading

  const isWithdrawLoading =
    poolType === "target" ? targetWithdraw.isLoading : flexibleWithdraw.isLoading

  const isRotational = poolType === "rotational"
  const isTarget = poolType === "target"
  const isFlexible = poolType === "flexible"

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>

      {error && (
        <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 text-destructive mb-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {isPending && (
        <div className="p-3 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 mb-4 text-sm">
          Contract pending deployment. Run <code>scripts/deploy.sh</code> and update the contract address.
        </div>
      )}

      <div className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="deposit">
            {isRotational ? "Deposit Fixed Amount (XLM)" : isTarget ? "Contribute Amount (XLM)" : "Deposit Amount (XLM)"}
          </Label>
          {!isRotational && (
            <Input
              id="deposit"
              type="number"
              step="0.01"
              placeholder="100"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              disabled={isDepositLoading}
            />
          )}
          <p className="text-xs text-muted-foreground">
            {isRotational && "Deposit the fixed pool amount. Same for all members."}
            {isTarget && "Contribute any amount toward the target goal."}
            {isFlexible && "Deposit any amount (must meet minimum). Withdraw anytime."}
          </p>
          <Button
            className="w-full bg-primary hover:bg-primary/90"
            onClick={handleDeposit}
            disabled={isDepositLoading || !address || isPending}
          >
            {isDepositLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ArrowUpRight className="mr-2 h-4 w-4" />
                {isRotational ? "Deposit" : isTarget ? "Contribute" : "Deposit"}
              </>
            )}
          </Button>
        </div>

        {!isRotational && (
          <div className="border-t border-border pt-6 space-y-3">
            <Label htmlFor="withdraw">
              {isTarget ? "Withdraw Share (XLM)" : "Withdraw Amount (XLM)"}
            </Label>
            <Input
              id="withdraw"
              type="number"
              step="0.01"
              placeholder="100"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              disabled={isWithdrawLoading}
            />
            <p className="text-xs text-muted-foreground">
              {isTarget && "Withdraw after target reached or deadline passed."}
              {isFlexible && "Withdraw anytime. Exit fee will be deducted."}
            </p>
            <Button
              variant="outline"
              className="w-full bg-transparent"
              onClick={handleWithdraw}
              disabled={isWithdrawLoading || !withdrawAmount || !address || isPending}
            >
              {isWithdrawLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowDownLeft className="mr-2 h-4 w-4" />
                  Withdraw
                </>
              )}
            </Button>
          </div>
        )}

        {isRotational && (
          <div className="border-t border-border pt-6 bg-blue-50 dark:bg-blue-950 p-3 rounded">
            <p className="text-xs text-muted-foreground">
              Rotational Pool: No direct withdrawals. Payouts are automatic when your turn comes.
              A relayer triggers payouts on schedule via the Soroban contract.
            </p>
          </div>
        )}

        <div className="border-t border-border pt-6">
          <p className="text-xs text-muted-foreground mb-2">Your Stellar address</p>
          <p className="text-sm font-mono bg-muted/30 p-2 rounded break-all">
            {address || "Not connected"}
          </p>
        </div>
      </div>
    </Card>
  )
}
