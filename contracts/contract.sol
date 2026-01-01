// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract EscrowV01 is ReentrancyGuard {

    enum Status {
        Funded,
        Submitted,
        Disputed,
        Resolved
    }

    struct Case {
        address payer;
        address payee;
        uint256 amount;

        bytes32 specs;
        bytes32 deliverables;
        uint64 reviewDeadline;

        Status status;
    }

    // funding -> specs populated
    // submitted -> deliverables (could delete this- )
        // if deleted, the person would submit, and the AI would judge if it meets the specificaitons- MIGHT BE USEFUL TO DELETE 
        // when deliverables are submitted 
    // funded -> submitted -> Resolved ✅ || Disputed ❌ -> Resolved ✅

    uint256 public nextCaseId;
    mapping(uint256 => Case) public cases;

    event CaseCreated(
        uint256 indexed caseId,
        address indexed payer,
        address indexed payee,
        uint256 amount,
        bytes32 specs
    );
    event DeliverableSubmitted(
        uint256 indexed caseId,
        bytes32 deliverables,
        uint64 reviewDeadline
    );
    event Accepted(uint256 indexed caseId);
    event DisputeOpened(uint256 indexed caseId);
    event Resolved(
        uint256 indexed caseId,
        address winner,
        bytes32 rationale
    );

    function createCase(
        address payee,
        bytes32 specs
    ) external payable returns (uint256 caseId) {
        require(payee != address(0), "bad payee");
        require(msg.value > 0, "no funds");
        require(specs != bytes32(0), "bad spec");

        caseId = nextCaseId++;
        cases[caseId] = Case({
            payer: msg.sender,
            payee: payee,
            amount: msg.value,
            specs: specs,
            deliverables: bytes32(0),
            reviewDeadline: 0,
            status: Status.Funded
        });

        emit CaseCreated(caseId, msg.sender, payee, msg.value, specs);
    }

    function submitDeliverable(
        uint256 caseId,
        bytes32 deliverables,
        uint64 reviewWindowSeconds
    ) external {
        Case storage c = cases[caseId];
        require(
            c.status == Status.Funded,
            "Wrong status- deliverables are either already submitted or resolved"
        );
        require(msg.sender == c.payee, "only payee");
        require(deliverables != bytes32(0), "bad deliverables");

        //Effects (CEI)
        c.deliverables = deliverables;
        c.status = Status.Submitted;

        // review window is a protocol anchor; payer can still accept anutime inv1
        // later, we use this to gate disputes/ auto-actions
        c.reviewDeadline = uint64(block.timestamp) + reviewWindowSeconds;

        emit DeliverableSubmitted(caseId, deliverables, c.reviewDeadline);
    }

    function accept(uint256 caseId) external nonReentrant {
        Case storage c = cases[caseId];
        require(c.status == Status.Submitted, "wrong status");
        require(msg.sender == c.payer, "only payer");
        require(c.amount > 0, "empty amount");

        // Effects (CEI)
        c.status = Status.Resolved;
        uint256 amt = c.amount;
        c.amount = 0;

        // interaction last
        (bool ok, ) = c.payee.call{value: amt}("");
        require(ok, "pay failed");

        emit Accepted(caseId);
    }

    // MVP rule: only payer can dispute, only after deliverables is submitted. relax/extend later
    function openDispute(
        uint256 caseId
    ) external {
        Case storage c = cases[caseId];
        require(c.status == Status.Submitted, "wrong status");
        require(msg.sender == c.payer, "only payer");

        c.status = Status.Disputed;

        emit DisputeOpened(caseId);
    }

    // if dispute is open, AI resolve function gets called automatically 
    // if contract is past the review deadline, accept gets called



}