// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CommunityVoting {

    // person who deployed contract
    address public admin;

    // voting status
    bool public votingActive;

    bool public resultsRevealed;
    // current voting topic
    string public votingTopic;

    // voting option
    struct VotingOption {
        string optionText;
        uint voteCount;
    }

    VotingOption[] private options;

    // keeps track of who voted
    mapping(address => bool) private hasVoted;

    // stores which option a user voted for
    mapping(address => uint) private userVotes;

    // excluded voters for current round
    mapping(address => bool) private excludedVoters;
    address[] private excludedList;

    // used to reset voting records
    address[] private votedAddresses;

    // winners after voting ends
    string[] private winners;

    constructor() {
        admin = msg.sender;
        votingActive = false;
        resultsRevealed = false;
    }

    modifier onlyAdmin() {
        require(
            msg.sender == admin,
            "Only admin can perform this action"
        );
        _;
    }

    modifier activeVoting() {
        require(
            votingActive,
            "Voting is not active"
        );
        _;
    }

    // PREPARE VOTING ROUND

    function prepareVotingRound(
        string memory topic,
        string[] memory votingOptions
    )
    public
    onlyAdmin
    {
        require(
            !votingActive,
            "Voting already active"
        );

        require(
            bytes(topic).length > 0,
            "Topic cannot be empty"
        );

        require(
            votingOptions.length >= 2,
            "Need at least 2 options"
        );

        // clear previous round data

        delete options;
        delete winners;

        for(uint i = 0; i < votedAddresses.length; i++) {
            hasVoted[votedAddresses[i]] = false;
            delete userVotes[votedAddresses[i]];
        }

        for(uint i = 0; i < excludedList.length; i++) {
            excludedVoters[excludedList[i]] = false;
        }

        delete votedAddresses;
        delete excludedList;

        votingTopic = topic;

        for(uint i = 0; i < votingOptions.length; i++) {

            require(
                bytes(votingOptions[i]).length > 0,
                "Option cannot be empty"
            );

            options.push(
                VotingOption(
                    votingOptions[i],
                    0
                )
            );
        }

        resultsRevealed = false;
        votingActive = true;
    }

    // OPTIONS

    function getOptionList()
    public
    view
    returns(string[] memory)
    {
        string[] memory list =
            new string[](options.length);

        for(uint i = 0; i < options.length; i++) {
            list[i] = options[i].optionText;
        }

        return list;
    }

    // ELIGIBILITY

function excludeVoter(address voter)
public
onlyAdmin
{
    require(
        votingActive,
        "Voting not active"
    );

    require(
        voter != address(0),
        "Invalid address"
    );

    require(
        voter != admin,
        "Cannot exclude admin"
    );

    require(
        !excludedVoters[voter],
        "Already excluded"
    );

    require(
        !hasVoted[voter],
        "Voter has already voted"
    );

    excludedVoters[voter] = true;
    excludedList.push(voter);
}


    function reinstateVoter(address voter)
    public
    onlyAdmin
    {
        require(
            excludedVoters[voter],
            "Voter is not excluded"
        );

        excludedVoters[voter] = false;
    }

    function isExcluded(address voter)
    public
    view
    returns(bool)
    {
        return excludedVoters[voter];
    }

    function getExcludedVoters()
    public
    view
    onlyAdmin
    returns(address[] memory)
    {
        return excludedList;
    }

    // VOTING

    function vote(uint optionIndex)
    public
    activeVoting
    {
        require(
            msg.sender != admin,
            "Admin cannot vote"
        );

        require(
            !excludedVoters[msg.sender],
            "You are excluded"
        );

        require(
            !hasVoted[msg.sender],
            "Already voted"
        );

        require(
            optionIndex < options.length,
            "Invalid option"
        );

        options[optionIndex].voteCount++;

        hasVoted[msg.sender] = true;
        userVotes[msg.sender] = optionIndex;

        votedAddresses.push(msg.sender);
    }

    function hasUserVoted()
    public
    view
    returns(bool)
    {
        return hasVoted[msg.sender];
    }

    function viewMyVote()
    public
    view
    returns(string memory)
    {
        require(
            hasVoted[msg.sender],
            "You have not voted"
        );

        return
            options[
                userVotes[msg.sender]
            ].optionText;
    }

    // END VOTING

    function endingVoting()
    public
    onlyAdmin
    {
        require(
            votingActive,
            "Voting already ended"
        );

        votingActive = false;

        calculateWinner();
    }

    // WINNER LOGIC

    function calculateWinner()
    internal
    {
        delete winners;

        uint maxVotes = 0;

        for(uint i = 0; i < options.length; i++) {

            if(
                options[i].voteCount >
                maxVotes
            ) {
                maxVotes =
                    options[i].voteCount;
            }
        }

        if(maxVotes == 0) {
            return;
        }

        for(uint i = 0; i < options.length; i++) {

            if(
                options[i].voteCount ==
                maxVotes
            ) {
                winners.push(
                    options[i].optionText
                );
            }
        }
    }

    // REVEAL RESULTS

    function revealResults()
    public
    onlyAdmin
    {
        require(
            !votingActive,
            "Voting still active"
        );

        resultsRevealed = true;
    }

    // RESULTS

    function getResults()
    public
    view
    returns(
        string[] memory,
        uint[] memory
    )
    {
        require(
            resultsRevealed,
            "Results not revealed"
        );

        string[] memory names =
            new string[](options.length);

        uint[] memory counts =
            new uint[](options.length);

        for(uint i = 0; i < options.length; i++) {

            names[i] =
                options[i].optionText;

            counts[i] =
                options[i].voteCount;
        }

        return (names, counts);
    }

    function getWinner()
    public
    view
    returns(string[] memory)
    {
        require(
            resultsRevealed,
            "Results not revealed"
        );

        return winners;
    }

    // STATUS INFO

    function getVotingStatus()
    public
    view
    returns(string memory)
    {
        if(votingActive) {
            return "Voting Active";
        }

        if(resultsRevealed) {
            return "Results Revealed";
        }

        return "Voting Ended";
    }

    function hasParticipantVoted(address voter) public view onlyAdmin returns(bool){
        return hasVoted[voter];
    }

    // RESET ROUND

    function resetVotingRound()
    public
    onlyAdmin
    {
        require(
            !votingActive,
            "Voting still active"
        );

        delete options;
        delete winners;

        votingTopic = "";

        resultsRevealed = false;
    }
}