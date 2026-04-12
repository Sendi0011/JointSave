"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X, Loader2, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useStellar } from "@/components/web3-provider"

// Stellar address validation (G... 56 chars)
function isValidStellarAddress(addr: string) {
  return /^G[A-Z2-7]{55}$/.test(addr)
}

export function RotationalForm() {
  const router = useRouter()
  const { address } = useStellar()
  const [members, setMembers] = useState<string[]>([""])
  const [error, setError] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    contributionAmount: "",
    frequency: "weekly",
  })

  const validMembers = members.filter(isValidStellarAddress)

  const frequencyMap: Record<string, number> = {
    daily: 86400,
    weekly: 604800,
    biweekly: 1209600,
    monthly: 2592000,
  }

  const addMember = () => setMembers([...members, ""])
  const removeMember = (index: number) => setMembers(members.filter((_, i) => i !== index))
  const updateMember = (index: number, value: string) => {
    const next = [...members]
    next[index] = value
    setMembers(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!address) return setError("Please connect your wallet first")
    if (validMembers.length < 2) return setError("Need at least 2 valid Stellar addresses (G...)")
    if (!formData.name) return setError("Please enter a group name")
    if (!formData.contributionAmount) return setError("Please enter a contribution amount")

    setIsCreating(true)
    try {
      // Pool contract must be deployed separately via Stellar CLI.
      // Here we save the pool metadata to the database with a placeholder contract ID.
      // After deploying the Soroban contract, update the contract_address in the DB.
      const response = await fetch("/api/pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          poolType: "rotational",
          creatorAddress: address,
          poolAddress: "pending_deployment",
          tokenAddress: process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ID || "native",
          members: validMembers,
          contributionAmount: formData.contributionAmount,
          roundDuration: frequencyMap[formData.frequency],
          frequency: formData.frequency,
        }),
      })

      if (!response.ok) throw new Error("Failed to save pool")
      const pool = await response.json()
      router.push(`/dashboard/group/${pool.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Group Name</Label>
        <Input
          id="name"
          placeholder="e.g., Family Savings Circle"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          placeholder="Describe the purpose of this savings group"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Contribution Amount (XLM)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            placeholder="100"
            value={formData.contributionAmount}
            onChange={(e) => setFormData({ ...formData, contributionAmount: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="frequency">Payout Frequency</Label>
          <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
            <SelectTrigger id="frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Bi-weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Member Stellar Addresses</Label>
          <Button type="button" variant="outline" size="sm" onClick={addMember}>
            <Plus className="h-4 w-4 mr-1" />
            Add Member
          </Button>
        </div>

        <div className="space-y-3">
          {members.map((member, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="G..."
                value={member}
                onChange={(e) => updateMember(index, e.target.value)}
              />
              {members.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => removeMember(index)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t border-border">
        <div className="bg-muted/30 rounded-lg p-4 mb-6">
          <h4 className="font-semibold mb-2">Summary</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>Total Members: {validMembers.length}</li>
            <li>Contribution per Member: {formData.contributionAmount || "0"} XLM</li>
            <li>Payout Frequency: {formData.frequency}</li>
            <li>Total Pool: {(parseFloat(formData.contributionAmount || "0") * validMembers.length).toFixed(2)} XLM</li>
          </ul>
        </div>

        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isCreating}>
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Group...
            </>
          ) : (
            "Create Rotational Group"
          )}
        </Button>
      </div>
    </form>
  )
}
