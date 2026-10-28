import { Contract } from '@algorandfoundation/tealscript';

/**
 * BountyEscrow Smart Contract for Algorand
 * 
 * Implements trustless locking of native ALGO bounties for Kanban tasks:
 * - Creator deposits ALGO into application escrow.
 * - Eligible assignee claims/binds their address.
 * - Upon verified completion, creator releases funds to the assignee via inner payment transaction.
 * - If cancelled or expired, creator can refund the escrowed deposit back to their address.
 * - Access control strictly restricts release and refund invocations to the verified task creator.
 */
export class BountyEscrow extends Contract {
  // Global state variables
  creator = GlobalStateKey<Address>();
  taskId = GlobalStateKey<bytes>();
  bountyAmount = GlobalStateKey<uint64>();
  assignee = GlobalStateKey<Address>();
  isFunded = GlobalStateKey<boolean>();
  isReleased = GlobalStateKey<boolean>();
  isRefunded = GlobalStateKey<boolean>();

  /**
   * Initializes the bounty escrow application with creator address and taskId.
   */
  createApplication(taskId: string): void {
    this.creator.value = this.txn.sender;
    this.taskId.value = taskId;
    this.bountyAmount.value = 0;
    this.assignee.value = Address.zeroAddress;
    this.isFunded.value = false;
    this.isReleased.value = false;
    this.isRefunded.value = false;
  }

  /**
   * Deposits native ALGO into the escrow application.
   * Verified via accompanying payment transaction into the contract address.
   */
  depositBounty(payTxn: PayTxn): void {
    assert(this.txn.sender === this.creator.value, 'Only creator can deposit bounty');
    assert(!this.isFunded.value, 'Bounty already funded');
    assert(payTxn.receiver === this.app.address, 'Payment must be sent to escrow application address');
    assert(payTxn.amount > 0, 'Bounty amount must be greater than zero');

    this.bountyAmount.value = payTxn.amount;
    this.isFunded.value = true;
  }

  /**
   * Binds an assignee's Algorand address to the task bounty.
   */
  claimTask(assigneeAddress: Address): void {
    assert(this.isFunded.value, 'Task must be funded before claiming');
    assert(!this.isReleased.value && !this.isRefunded.value, 'Escrow already settled');
    assert(this.assignee.value === Address.zeroAddress, 'Task is already assigned');

    this.assignee.value = assigneeAddress;
  }

  /**
   * Releases locked ALGO to the task assignee upon creator approval.
   * Transfers funds via an inner payment transaction.
   */
  releaseBounty(): void {
    // Access control: only creator can approve release
    assert(this.txn.sender === this.creator.value, 'Unauthorized: only task creator can release payout');
    assert(this.isFunded.value, 'Escrow not funded');
    assert(!this.isReleased.value, 'Bounty already released');
    assert(!this.isRefunded.value, 'Bounty was already refunded');
    assert(this.assignee.value !== Address.zeroAddress, 'No assignee bound to task');

    const payout = this.bountyAmount.value;
    this.isReleased.value = true;

    // Dispatch inner payment transaction to assignee
    sendPayment({
      receiver: this.assignee.value,
      amount: payout,
      fee: 0 // Fee pooled or paid by outer transaction
    });
  }

  /**
   * Refunds locked ALGO back to the task creator if task is cancelled or abandoned.
   */
  refundBounty(): void {
    // Access control: only creator can claim refund
    assert(this.txn.sender === this.creator.value, 'Unauthorized: only task creator can request refund');
    assert(this.isFunded.value, 'Escrow not funded');
    assert(!this.isReleased.value, 'Cannot refund released bounty');
    assert(!this.isRefunded.value, 'Bounty already refunded');

    const refundAmount = this.bountyAmount.value;
    this.isRefunded.value = true;

    // Dispatch inner payment transaction back to creator
    sendPayment({
      receiver: this.creator.value,
      amount: refundAmount,
      fee: 0
    });
  }
}
