// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ClaimHelper - Atomic singleton swap to let a Safe proxy receive RBTC via .send()
/// @notice Deployed on RSK mainnet to work around the 2300 gas stipend issue.
///         The Safe proxy's fallback always does SLOAD(800 gas) + DELEGATECALL(700 gas),
///         leaving only ~1317 gas for the singleton's receive(). The original Safe singleton
///         emits SafeReceived (LOG2 ~1381 gas) which exceeds 1317. This contract provides
///         an empty receive() that costs ~20 gas, fitting within the budget.
contract ClaimHelper {
    // MUST be at storage slot 0 to match GnosisSafeProxy layout
    address internal singleton;

    /// @notice Atomically: swap singleton -> execute governor proposal -> restore singleton
    /// @param claimHelperAddr The deployed address of THIS contract (not address(this) in delegatecall context)
    /// @param originalSingleton The Safe's current singleton to restore after claiming
    /// @param governor The GovernorRootstockCollective proxy address
    /// @param proposalId The governance proposal ID to execute
    function claimAndRestore(
        address claimHelperAddr,
        address originalSingleton,
        address governor,
        uint256 proposalId
    ) external {
        singleton = claimHelperAddr;

        // execute(uint256) selector = 0xfe0d94c1
        (bool success, ) = governor.call(
            abi.encodeWithSelector(bytes4(0xfe0d94c1), proposalId)
        );
        require(success, "Claim failed");

        singleton = originalSingleton;
    }

    receive() external payable {}
}
