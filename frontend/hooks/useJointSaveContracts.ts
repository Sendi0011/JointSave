import { useState, useCallback } from "react"
import * as StellarSdk from "@stellar/stellar-sdk"
import { useStellar, STELLAR_RPC_URL, STELLAR_NETWORK_PASSPHRASE } from "@/components/web3-provider"

const FACTORY_CONTRACT_ID =
  process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ID || ""

// ── Soroban RPC client ────────────────────────────────────────────────────────

function getRpc() {
  return new StellarSdk.SorobanRpc.Server(STELLAR_RPC_URL)
}

// ── Helper: sign & submit a transaction ──────────────────────────────────────

async function signAndSubmit(
  kit: any,
  address: string,
  tx: StellarSdk.Transaction
): Promise<string> {
  const { signedTxXdr } = await kit.signTransaction(tx.toXDR(), {
    networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
    address,
  })

  const rpc = getRpc()
  const result = await rpc.sendTransaction(
    StellarSdk.TransactionBuilder.fromXDR(
      signedTxXdr,
      STELLAR_NETWORK_PASSPHRASE
    )
  )

  if (result.status === "ERROR") {
    throw new Error(`Transaction failed: ${result.errorResult}`)
  }

  // Poll for confirmation
  let response = await rpc.getTransaction(result.hash)
  while (response.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 1500))
    response = await rpc.getTransaction(result.hash)
  }

  if (response.status !== "SUCCESS") {
    throw new Error("Transaction did not succeed")
  }

  return result.hash
}

// ── Build a contract call transaction ────────────────────────────────────────

async function buildContractTx(
  address: string,
  contractId: string,
  method: string,
  args: StellarSdk.xdr.ScVal[]
): Promise<StellarSdk.Transaction> {
  const rpc = getRpc()
  const account = await rpc.getAccount(address)
  const contract = new StellarSdk.Contract(contractId)

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build()

  const prepared = await rpc.prepareTransaction(tx)
  return prepared as StellarSdk.Transaction
}

// ── Address helper ────────────────────────────────────────────────────────────

function addrVal(addr: string) {
  return StellarSdk.nativeToScVal(addr, { type: "address" })
}

function i128Val(n: string | number) {
  return StellarSdk.nativeToScVal(BigInt(n), { type: "i128" })
}

function u32Val(n: number) {
  return StellarSdk.nativeToScVal(n, { type: "u32" })
}

function u64Val(n: number | bigint) {
  return StellarSdk.nativeToScVal(BigInt(n), { type: "u64" })
}

function boolVal(b: boolean) {
  return StellarSdk.nativeToScVal(b, { type: "bool" })
}

function vecVal(env: any, addrs: string[]) {
  return StellarSdk.xdr.ScVal.scvVec(
    addrs.map((a) => addrVal(a))
  )
}

// ── Hook factory ─────────────────────────────────────────────────────────────

function useContractCall() {
  const { kit, address } = useStellar()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [hash, setHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const call = useCallback(
    async (
      contractId: string,
      method: string,
      args: StellarSdk.xdr.ScVal[]
    ) => {
      if (!kit || !address) throw new Error("Wallet not connected")
      setIsLoading(true)
      setIsSuccess(false)
      setError(null)
      try {
        const tx = await buildContractTx(address, contractId, method, args)
        const txHash = await signAndSubmit(kit, address, tx)
        setHash(txHash)
        setIsSuccess(true)
        return txHash
      } catch (e: any) {
        setError(e.message || "Transaction failed")
        throw e
      } finally {
        setIsLoading(false)
      }
    },
    [kit, address]
  )

  return { call, isLoading, isSuccess, hash, error }
}

// ── Register pool with factory ────────────────────────────────────────────────

export function useRegisterPool(poolType: "rotational" | "target" | "flexible") {
  const { call, isLoading, isSuccess, hash, error } = useContractCall()

  const methodMap = {
    rotational: "register_rotational",
    target: "register_target",
    flexible: "register_flexible",
  }

  const register = useCallback(
    async (callerAddress: string, poolContractId: string) => {
      const poolIdBytes = StellarSdk.xdr.ScVal.scvBytes(
        Buffer.from(poolContractId, "hex")
      )
      return call(FACTORY_CONTRACT_ID, methodMap[poolType], [
        addrVal(callerAddress),
        poolIdBytes,
      ])
    },
    [call, poolType]
  )

  return { register, isLoading, isSuccess, hash, error }
}

// ── Rotational pool ───────────────────────────────────────────────────────────

export function useRotationalDeposit(poolContractId: string) {
  const { call, isLoading, isSuccess, hash, error } = useContractCall()
  const { address } = useStellar()

  const deposit = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected")
    return call(poolContractId, "deposit", [addrVal(address)])
  }, [call, poolContractId, address])

  return { deposit, isLoading, isSuccess, hash, error }
}

export function useTriggerPayout(poolContractId: string) {
  const { call, isLoading, isSuccess, hash, error } = useContractCall()
  const { address } = useStellar()

  const trigger = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected")
    return call(poolContractId, "trigger_payout", [addrVal(address)])
  }, [call, poolContractId, address])

  return { trigger, isLoading, isSuccess, hash, error }
}

// ── Target pool ───────────────────────────────────────────────────────────────

export function useTargetContribute(poolContractId: string, amount: string) {
  const { call, isLoading, isSuccess, hash, error } = useContractCall()
  const { address } = useStellar()

  const contribute = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected")
    // amount in stroops (1 XLM = 10_000_000 stroops)
    const stroops = Math.round(parseFloat(amount) * 1e7).toString()
    return call(poolContractId, "contribute", [
      addrVal(address),
      i128Val(stroops),
    ])
  }, [call, poolContractId, address, amount])

  return { contribute, isLoading, isSuccess, hash, error }
}

export function useTargetWithdraw(poolContractId: string) {
  const { call, isLoading, isSuccess, hash, error } = useContractCall()
  const { address } = useStellar()

  const withdraw = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected")
    return call(poolContractId, "withdraw", [addrVal(address)])
  }, [call, poolContractId, address])

  return { withdraw, isLoading, isSuccess, hash, error }
}

// ── Flexible pool ─────────────────────────────────────────────────────────────

export function useFlexibleDeposit(poolContractId: string, amount: string) {
  const { call, isLoading, isSuccess, hash, error } = useContractCall()
  const { address } = useStellar()

  const deposit = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected")
    const stroops = Math.round(parseFloat(amount) * 1e7).toString()
    return call(poolContractId, "deposit", [
      addrVal(address),
      i128Val(stroops),
    ])
  }, [call, poolContractId, address, amount])

  return { deposit, isLoading, isSuccess, hash, error }
}

export function useFlexibleWithdraw(poolContractId: string, amount: string) {
  const { call, isLoading, isSuccess, hash, error } = useContractCall()
  const { address } = useStellar()

  const withdraw = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected")
    const stroops = Math.round(parseFloat(amount) * 1e7).toString()
    return call(poolContractId, "withdraw", [
      addrVal(address),
      i128Val(stroops),
    ])
  }, [call, poolContractId, address, amount])

  return { withdraw, isLoading, isSuccess, hash, error }
}
