/*
 * INTE2628/2679 Assignment 2
 * Browser frontend for contract.sol.
 * Uses the provided Web3.min.js library and MetaMask only, no other external libraries or frameworks.
 */

const CONTRACT_ADDRESS = "0xcB6AB1AE0A8F3EC95D52a7908fA891d026880871";

// This ABI describes the functions available in our deployed smart contract i.e contract.sol.
// Web3.js usesthis ABI to call functions such as vote(), getResults() and prepareVotingRound().
const CONTRACT_ABI = [
    { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
    { "inputs": [], "name": "admin", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "votingActive", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "resultsRevealed", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "votingTopic", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "getOptionList", "outputs": [{ "internalType": "string[]", "name": "", "type": "string[]" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "getVotingStatus", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "address", "name": "voter", "type": "address" }], "name": "excludeVoter", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{ "internalType": "address", "name": "voter", "type": "address" }], "name": "reinstateVoter", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{ "internalType": "address", "name": "voter", "type": "address" }], "name": "isExcluded", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "getExcludedVoters", "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "uint256", "name": "optionIndex", "type": "uint256" }], "name": "vote", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [], "name": "hasUserVoted", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "viewMyVote", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "address", "name": "voter", "type": "address" }], "name": "hasParticipantVoted", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "endingVoting", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [], "name": "revealResults", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [], "name": "getResults", "outputs": [
        { "internalType": "string[]", "name": "", "type": "string[]" },
        { "internalType": "uint256[]", "name": "", "type": "uint256[]" }
    ], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "getWinner", "outputs": [{ "internalType": "string[]", "name": "", "type": "string[]" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "string", "name": "topic", "type": "string" }, { "internalType": "string[]", "name": "votingOptions", "type": "string[]" }], "name": "prepareVotingRound", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [], "name": "resetVotingRound", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
];

let web3;
let contract;
let currentAccount;
let currentOptions = [];

const $ = (id) => document.getElementById(id);

function setMessage(id, text) {
    $(id).textContent = text || "";
}

function showError(error) {
    const message = error?.message || String(error);
    setMessage("globalMessage", message);
}

// The below code Connects the user's MetaMask wallet to the voting application.
// Connected address is used to identify whether the user is the Admin or just a normal participant.
async function connectWallet() {
    try {
        if (!window.ethereum) {
            throw new Error("MetaMask was not detected. Please install or enable MetaMask.");
        }
        if (CONTRACT_ADDRESS.includes("PASTE_")) {
            throw new Error("Set CONTRACT_ADDRESS in application.js after deploying the contract through Remix.");
        }

        web3 = new Web3(window.ethereum);
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        currentAccount = accounts[0];
        contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

        await refreshAll();
        setMessage("globalMessage", "Wallet connected.");
    } catch (error) {
        showError(error);
    }
}
//The below code reads the any updated information from the smart contract and updates the page.
// This helps in keeping the frontend and information stored on the blockchain in sync.
async function refreshWallet() {
    if (!web3 || !currentAccount) return;

    const chainId = String(await web3.eth.getChainId());
    const balanceWei = await web3.eth.getBalance(currentAccount);
    const balanceEth = web3.utils.fromWei(balanceWei, "ether");

    $("walletAddress").textContent = currentAccount;
    $("networkInfo").textContent = chainId === "11155111"
        ? "Sepolia (11155111)"
        : `Chain ID ${chainId}`;
    $("walletBalance").textContent = `${balanceEth} ETH`;
}

async function refreshContractState() {
    if (!contract || !currentAccount) return;

    const [admin, status, topic, options, excluded, voted, resultsRevealed] = await Promise.all([
    contract.methods.admin().call(),
    contract.methods.getVotingStatus().call(),
    contract.methods.votingTopic().call(),
    contract.methods.getOptionList().call(),
    contract.methods.isExcluded(currentAccount).call(),
    contract.methods.hasUserVoted().call({
        from: currentAccount
    }),
    contract.methods.resultsRevealed().call()
    ]);

    currentOptions = Array.from(options);

    const isAdmin = admin.toLowerCase() === currentAccount.toLowerCase();
    $("userRole").textContent = isAdmin ? "Admin" : "Participant";
    $("votingStatus").textContent = status;
    $("topicDisplay").textContent = topic || "-";
    $("eligibilityStatus").textContent = isAdmin
        ? "Admin (not eligible to vote)"
        : (excluded ? "Excluded" : "Eligible unless already voted");
    $("hasVotedStatus").textContent = String(voted);
    
    if (resultsRevealed) {
    $("resultsAvailability").textContent = "Results have been revealed.";
    $("resultsWarning").textContent = "";
} else {
    $("resultsAvailability").textContent = "Results are not available yet.";
    $("resultsWarning").textContent =
        "Results can only be loaded after the Admin reveals them.";
}

    renderOptions();
    renderWarnings(isAdmin, status, excluded, voted);
}

function renderOptions() {
    if (!currentOptions.length) {
        $("optionsDisplay").textContent = "No voting round prepared.";
        $("voteOptions").textContent = "No voting options available.";
        return;
    }

    $("optionsDisplay").innerHTML = currentOptions
        .map((option, i) => `<div class="option-item"><strong>${i + 1}.</strong> ${escapeHtml(option)}</div>`)
        .join("");

    $("voteOptions").innerHTML = currentOptions
        .map((option, i) => `
            <label class="option-item">
                <input type="radio" name="voteOption" value="${i}">
                ${escapeHtml(option)}
            </label>
        `)
        .join("");
}

function renderWarnings(isAdmin, status, excluded, voted) {
    $("prepareWarning").textContent = isAdmin
        ? (status === "Voting Active" ? "Prepare is restricted while voting is active." : "")
        : "Admin only: the connected wallet is not the Admin.";

    $("eligibilityWarning").textContent = isAdmin
        ? (status === "Voting Active" ? "Eligibility controls are available during voting." : "Eligibility changes require an active round.")
        : "Admin only: eligibility actions will be rejected for this wallet.";

    $("participantStatusWarning").textContent = isAdmin
        ? ""
        : "Admin only: participant voting status cannot be queried by participants.";

    $("lifecycleWarning").textContent = isAdmin
        ? (status === "Voting Active" ? "End voting first before revealing or resetting." : "")
        : "Admin only: end, reveal and reset actions will be rejected for this wallet.";

    if (isAdmin) {
        $("voteWarning").textContent = "Admin accounts cannot vote.";
    } else if (status !== "Voting Active") {
        $("voteWarning").textContent = "Voting is not currently open.";
    } else if (excluded) {
        $("voteWarning").textContent = "This participant is excluded from the current round.";
    } else if (voted) {
        $("voteWarning").textContent = "This participant has already voted.";
    } else {
        $("voteWarning").textContent = "";
    }

    $("viewVoteWarning").textContent = voted
        ? ""
        : "You can view your vote only after you have voted.";
}

//  Changes in blockchain state are due to actions from admin or participants.
// The helper function below sends all those transactions through MetaMask and waits for the user to approve them before refreshing the page.
async function sendTransaction(method, successMessage) {
    try {
        setMessage("globalMessage", "Waiting for MetaMask confirmation...");
        const receipt = await method.send({ from: currentAccount });
        setMessage("globalMessage", `${successMessage} Transaction: ${receipt.transactionHash}`);
        await refreshAll();
        return receipt;
    } catch (error) {
        showError(error);
    }
}

async function prepareRound() {
    if (!contract) return setMessage("globalMessage", "Connect MetaMask first.");
    const topic = $("topicInput").value;
    const optionLines = $("optionsInput").value.split("\n").map(x => x.trim());
    await sendTransaction(
        contract.methods.prepareVotingRound(topic, optionLines),
        "Voting round prepared."
    );
}

// Submits the participant's selected option to the smart contract.
// The smart contract checks whether the participant is eligible to vote, has already voted, and whether the option selected is valid.
async function castVote() {
    if (!contract) {
        return setMessage("globalMessage", "Connect MetaMask first.");
    }

    const selected = document.querySelector('input[name="voteOption"]:checked');

    if (!selected) {
        setMessage("voteMessage", "Select an option first.");
        return;
    }

    try {
        const excluded = await contract.methods
            .isExcluded(currentAccount)
            .call();

        const alreadyVoted = await contract.methods
            .hasUserVoted()
            .call({
                from: currentAccount
            });

        if (excluded) {
            setMessage(
                "voteMessage",
                "You are excluded from this voting round."
            );
            $("voteWarning").textContent =
                "This participant is excluded from the current round.";
            return;
        }

        if (alreadyVoted) {
            setMessage(
                "voteMessage",
                "You have already voted in this round."
            );
            $("voteWarning").textContent =
                "This participant has already voted.";
            return;
        }

        await sendTransaction(
            contract.methods.vote(Number(selected.value)),
            "Vote submitted."
        );

    } catch (error) {
        showError(error);
    }
}

async function excludeParticipant() {
    const address = $("eligibilityAddress").value.trim();

    if (!address) {
        setMessage("eligibilityMessage", "Enter a participant wallet address.");
        return;
    }

    const receipt = await sendTransaction(
        contract.methods.excludeVoter(address),
        "Participant excluded."
    );

    if (receipt) {
        setMessage("eligibilityMessage", "Participant excluded successfully.");
        await loadExcludedList();
    }
}

async function reinstateParticipant() {
    const address = $("eligibilityAddress").value.trim();

    if (!address) {
        setMessage("eligibilityMessage", "Enter a participant wallet address.");
        return;
    }

    const receipt = await sendTransaction(
        contract.methods.reinstateVoter(address),
        "Participant reinstated."
    );

    if (receipt) {
        setMessage("eligibilityMessage", "Participant reinstated successfully.");
        await loadExcludedList();
    }
}

async function loadExcludedList() {
    try {
        if (!contract || !currentAccount) {
            setMessage("globalMessage", "Connect the Admin wallet first.");
            return;
        }

        const addresses = await contract.methods
            .getExcludedVoters()
            .call({ from: currentAccount });

        $("excludedListResult").textContent = addresses.length
            ? addresses.join("\n")
            : "No participants are currently excluded.";
    } catch (error) {
        showError(error);
    }
}

async function checkParticipantStatus() {
    try {
        const address = $("statusAddress").value.trim();
        const voted = await contract.methods.hasParticipantVoted(address).call({ from: currentAccount });
        $("participantStatusResult").textContent = `${address}: has voted = ${voted}`;
    } catch (error) { showError(error); }
}

async function endVoting() {
    await sendTransaction(contract.methods.endingVoting(), "Voting ended.");
}

async function revealResults() {
    await sendTransaction(contract.methods.revealResults(), "Results revealed.");
}

async function resetRound() {
    await sendTransaction(contract.methods.resetVotingRound(), "Voting round reset.");
}

async function viewMyVote() {
    try {
        if (!contract || !currentAccount) {
            setMessage("myVoteResult", "Connect your wallet first.");
            return;
        }

        const result = await contract.methods.viewMyVote().call({
            from: currentAccount
        });

        $("myVoteResult").textContent = `Your vote: ${result}`;
    } catch (error) {
        $("myVoteResult").textContent = "Your vote could not be loaded.";
        showError(error);
    }
}

// Loads the final results.
// The smart contract can only reveal the results when the Admin has ended voting and revealed the results.
async function loadResults() {
    try {
        const result = await contract.methods.getResults().call();

        const names = Array.from(result[0]);
        const counts = Array.from(result[1]);
        const winners = Array.from(
            await contract.methods.getWinner().call()
        );

        // Results are available because the Admin has revealed them.
        $("resultsAvailability").textContent = "Results have been revealed.";

        // Clear all old warning messages.
        $("resultsWarning").textContent = "";

        // Display every option, its vote count, and the winner/winner(s).
        $("resultsDisplay").innerHTML = `
            <strong>Option results:</strong><br>
            ${names
                .map((name, i) => `${escapeHtml(name)}: ${counts[i]} vote(s)`)
                .join("<br>")}

            <br><br>
            <strong>Winner(s):</strong><br>
            ${
                winners.length
                    ? winners.map(escapeHtml).join(", ")
                    : "No winner (no votes)"
            }
        `;

    } catch (error) {
        // Explains the reason on why the results cannot be loaded.
        $("resultsAvailability").textContent =
            "Results are not available yet.";

        $("resultsWarning").textContent =
            "Results can only be loaded after the Admin reveals them.";

        showError(error);
    }
}

async function refreshAll() {
    await refreshWallet();
    await refreshContractState();
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

$("connectButton").addEventListener("click", connectWallet);
$("prepareButton").addEventListener("click", prepareRound);
$("voteButton").addEventListener("click", castVote);
$("viewVoteButton").addEventListener("click", viewMyVote);
$("excludeButton").addEventListener("click", excludeParticipant);
$("reinstateButton").addEventListener("click", reinstateParticipant);
$("excludedListButton").addEventListener("click", loadExcludedList);
$("participantStatusButton").addEventListener("click", checkParticipantStatus);
$("endButton").addEventListener("click", endVoting);
$("revealButton").addEventListener("click", revealResults);
$("resetButton").addEventListener("click", resetRound);
$("loadResultsButton").addEventListener("click", loadResults);

if (window.ethereum) {
    window.ethereum.on("accountsChanged", async (accounts) => {
        if (!accounts.length) {
            currentAccount = null;
            return;
        }
        currentAccount = accounts[0];
        if (web3 && contract) await refreshAll();
    });

    window.ethereum.on("chainChanged", () => {
        window.location.reload();
    });
}
