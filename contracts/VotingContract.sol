// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;


contract VotingContract {
    enum VotingState { notStarted, Started, Finished }

    struct Movie {
        string name;
        uint256 voteCount;
    }

    struct VotingSession {
        address owner;
        VotingState votingState;
        uint256 votingEndTime;
        string winner;
        Movie[] movies;
    }

    mapping(address => bool) private hasVoted;
    mapping(uint256 => VotingSession) public votingSessions;
    mapping(address => uint) private lastCreated;
    uint public sessionCounter;

    event VoteStarted(address indexed owner, uint sessionId);

    constructor() {
        sessionCounter = 0;
    }

    error MovieNotFound(string MovieName);
   
    modifier inState(uint sessionId, VotingState _state) {
        require(votingSessions[sessionId].votingState == _state, "Invalid state");
        _;
    }

    modifier onlyOwner(uint sessionId) {
        require(msg.sender == votingSessions[sessionId].owner, "Not the owner");
        _;
    }

     fallback() external payable {
        revert("Fallback function. Call a function that exists!");
    }

    receive() external payable {}

    function createVotingSession(string[] memory _options) external returns (uint) {
        require(block.timestamp > lastCreated[msg.sender] + 2 hours, "you can only create a session every 2 hours");
         lastCreated[msg.sender] = block.timestamp;

        require(_options.length > 1, "You must pick at least 2 movies");

        sessionCounter++;
        VotingSession storage session = votingSessions[sessionCounter];
        session.owner = msg.sender;

          for (uint i = 0; i < _options.length; ++i) {
           session.movies.push(Movie({
                name: _options[i],
                voteCount: 0
            }));
        }

        session.votingState = VotingState.notStarted;
        session.winner = "";

        return sessionCounter;
    }

    function startVoting(uint sessionId, uint _duration) external inState(sessionId, VotingState.notStarted) onlyOwner(sessionId) {
       VotingSession storage session = votingSessions[sessionId];
        session.votingState = VotingState.Started;
        session.votingEndTime = block.timestamp + _duration;

        emit VoteStarted(msg.sender, sessionId);

        assert(session.votingState == VotingState.Started); 
    }

    function vote(uint sessionId, string memory _votingOption) external inState(sessionId, VotingState.Started){
        VotingSession storage session = votingSessions[sessionId];
        require(block.timestamp <= session.votingEndTime, "Voting has ended");
        require(!hasVoted[msg.sender], "You have already voted");

        bool _found = false;
        for(uint i = 0; i < session.movies.length; i++) {
            if (keccak256(bytes(session.movies[i].name)) == keccak256(bytes(_votingOption))) {
                session.movies[i].voteCount += 1;
                _found = true;
                break;
            }
        }
        if (!_found){
            revert MovieNotFound(_votingOption);
        }
        hasVoted[msg.sender] = true;
    }

    function determineWinner(uint sessionId) internal {
        VotingSession storage session = votingSessions[sessionId];
  
        uint highestVoteCount = 0;

        for(uint i = 0; i < session.movies.length; i++) {
            if (session.movies[i].voteCount > highestVoteCount) {
                highestVoteCount = session.movies[i].voteCount;
                session.winner = session.movies[i].name;
            }
        }
        
    }

    function endVoting(uint sessionId) external inState(sessionId, VotingState.Started) onlyOwner(sessionId) {
        VotingSession storage session = votingSessions[sessionId];
        require(block.timestamp >= session.votingEndTime, "Voting period has not ended yet");

        session.votingState = VotingState.Finished;

        determineWinner(sessionId);
    }

    function getMovies(uint sessionId) external view returns (Movie[] memory) {
        return votingSessions[sessionId].movies;
    }

    function getWinner(uint sessionId) external view returns (string memory) {
        return votingSessions[sessionId].winner;
    }

}