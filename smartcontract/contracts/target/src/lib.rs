#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, Vec, symbol_short,
};

#[contracttype]
pub enum DataKey {
    Token,
    Treasury,
    Members,
    TargetAmount,
    Deadline,
    TreasuryFeeBps,
    TotalContributed,
    Completed,
    Active,
    Contribution(Address),
}

#[contract]
pub struct TargetPool;

#[contractimpl]
impl TargetPool {
    pub fn initialize(
        env: Env,
        token: Address,
        members: Vec<Address>,
        target_amount: i128,
        deadline: u64,
        treasury_fee_bps: u32,
        treasury: Address,
    ) {
        assert!(members.len() >= 2, "need >=2 members");
        assert!(target_amount > 0, "target must be > 0");
        assert!(deadline > env.ledger().timestamp(), "deadline in past");

        let storage = env.storage().persistent();
        storage.set(&DataKey::Token, &token);
        storage.set(&DataKey::Treasury, &treasury);
        storage.set(&DataKey::Members, &members);
        storage.set(&DataKey::TargetAmount, &target_amount);
        storage.set(&DataKey::Deadline, &deadline);
        storage.set(&DataKey::TreasuryFeeBps, &treasury_fee_bps);
        storage.set(&DataKey::TotalContributed, &0i128);
        storage.set(&DataKey::Completed, &false);
        storage.set(&DataKey::Active, &true);
    }

    pub fn contribute(env: Env, member: Address, amount: i128) {
        member.require_auth();

        let storage = env.storage().persistent();
        let active: bool = storage.get(&DataKey::Active).unwrap();
        assert!(active, "pool inactive");

        let deadline: u64 = storage.get(&DataKey::Deadline).unwrap();
        assert!(env.ledger().timestamp() <= deadline, "deadline passed");
        assert!(amount > 0, "amount must be > 0");

        let members: Vec<Address> = storage.get(&DataKey::Members).unwrap();
        assert!(Self::is_member(&members, &member), "not a member");

        let token_addr: Address = storage.get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&member, &env.current_contract_address(), &amount);

        let prev: i128 = storage
            .get(&DataKey::Contribution(member.clone()))
            .unwrap_or(0);
        storage.set(&DataKey::Contribution(member.clone()), &(prev + amount));

        let total: i128 = storage.get(&DataKey::TotalContributed).unwrap();
        let new_total = total + amount;
        storage.set(&DataKey::TotalContributed, &new_total);

        env.events()
            .publish((symbol_short!("contrib"), member), amount);

        let target: i128 = storage.get(&DataKey::TargetAmount).unwrap();
        if new_total >= target {
            storage.set(&DataKey::Completed, &true);
            env.events()
                .publish((symbol_short!("reached"),), new_total);
        }
    }

    pub fn withdraw(env: Env, member: Address) {
        member.require_auth();

        let storage = env.storage().persistent();
        let completed: bool = storage.get(&DataKey::Completed).unwrap_or(false);
        let deadline: u64 = storage.get(&DataKey::Deadline).unwrap();
        assert!(
            completed || env.ledger().timestamp() > deadline,
            "not ready to withdraw"
        );

        let contribution: i128 = storage
            .get(&DataKey::Contribution(member.clone()))
            .unwrap_or(0);
        assert!(contribution > 0, "no contribution");

        let total: i128 = storage.get(&DataKey::TotalContributed).unwrap();
        let fee_bps: u32 = storage.get(&DataKey::TreasuryFeeBps).unwrap();
        let total_fees = (total * fee_bps as i128) / 10000;
        let net = total - total_fees;
        let user_share = (contribution * net) / total;

        storage.set(&DataKey::Contribution(member.clone()), &0i128);

        let token_addr: Address = storage.get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&env.current_contract_address(), &member, &user_share);

        env.events()
            .publish((symbol_short!("withdraw"), member), user_share);
    }

    pub fn treasury_withdraw(env: Env, admin: Address) {
        admin.require_auth();

        let storage = env.storage().persistent();
        let completed: bool = storage.get(&DataKey::Completed).unwrap_or(false);
        let deadline: u64 = storage.get(&DataKey::Deadline).unwrap();
        assert!(
            completed || env.ledger().timestamp() > deadline,
            "not ready"
        );

        let total: i128 = storage.get(&DataKey::TotalContributed).unwrap();
        let fee_bps: u32 = storage.get(&DataKey::TreasuryFeeBps).unwrap();
        let fees = (total * fee_bps as i128) / 10000;
        assert!(fees > 0, "no fees");

        let treasury: Address = storage.get(&DataKey::Treasury).unwrap();
        let token_addr: Address = storage.get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&env.current_contract_address(), &treasury, &fees);
    }

    // ── Views ──────────────────────────────────────────────────────────────

    pub fn is_completed(env: Env) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Completed)
            .unwrap_or(false)
    }

    pub fn total_contributed(env: Env) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::TotalContributed)
            .unwrap_or(0)
    }

    pub fn contribution_of(env: Env, member: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Contribution(member))
            .unwrap_or(0)
    }

    pub fn members(env: Env) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::Members)
            .unwrap_or(Vec::new(&env))
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    fn is_member(members: &Vec<Address>, who: &Address) -> bool {
        for m in members.iter() {
            if m == *who {
                return true;
            }
        }
        false
    }
}
