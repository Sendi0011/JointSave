"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, X, Loader2, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useStellar } from "@/components/web3-provider"

function isValidStellarAddress(addr: string) {
  return /^G[A-Z2-7]{55}$/.test(addr)
}

export function TargetForm() {
  const router = useRouter()
  const { address } = useStellar()
  const [members, setMembers] = useState<string[]>([""])
  const [error, setError] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    targetAmount: "",
    deadline: "",
  })

  const validMembers = members.filter(isValidStellarAddress)

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
    if (!formData.targetAmount) return setError("Please enter a target amount")
    if (!formData.deadline) return setError("Please select a deadline")
    if (new Date(formData.deadline) <= new Date()) return setError("Deadline must be in the future")

    setIsCreating(true)
    try {
      const response = await fetch("/api/pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          poolType: "target",
          creatorAddress: address,
          poolAddress: "pending_deployment",
          tokenAddress: process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ID || "native",
          members: validMembers,
          targetAmount: formData.targetAmount,
          deadline: formData.deadline,
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

  const contributionPerMember =
    validMembers.length > 0
      ? (parseFloat(formData.targetAmount || "0") / validMembers.length).toFixed(2)
      : "0"

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
          placeholder="e.g., Wedding Fund"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          placeholder="Describe the savings goal"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="target">Target Amount (XLM)</Label>
          <Input
            id="target"
            type="number"
            step="0.01"
            placeholder="5000"
            value={formData.targetAmount}
            onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deadline">Target Deadline</Label>
          <Input
            id="deadline"
            type="date"
            value={formData.deadline}
            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            required
          />
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
            <li>Target Amount: {formData.targetAmount || "0"} XLM</li>
            <li>Contribution per Member: {contributionPerMember} XLM</li>
            <li>Deadline: {formData.deadline || "Not set"}</li>
          </ul>
        </div>

        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isCreating}>
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Group...
            </>
          ) : (
            "Create Target Pool"
          )}
        </Button>
      </div>
    </form>
  )
}
