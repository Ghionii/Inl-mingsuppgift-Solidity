# VotingContract

The VotingContract is a Solidity smart contract designed to facilitate a voting system for movie selections. This contract allows users to create voting sessions, start and end voting, cast votes, and determine the winner based on the votes received.

Contract Features
Voting State Management

Enum: VotingState with three states: notStarted, Started, and Finished.
Functions to manage state transitions (startVoting and endVoting).
Voting Sessions

Struct: VotingSession includes details about the session such as the owner, voting state, end time, winner, and a list of movies.
Mapping: mapping(uint256 => VotingSession) for storing and accessing voting sessions by their unique IDs.
Movie Struct

Struct: Movie includes a name and voteCount.
Voting Mechanics

Users can create new voting sessions (createVotingSession), vote for their preferred movie (vote), and determine the winner (determineWinner).
Security and Access Control

Modifiers: inState ensures functions are only called when the contract is in the correct state, and onlyOwner ensures only the session creator can perform certain actions.
Error Handling: Custom error MovieNotFound for handling invalid voting options.
Gas Optimization and Security

Mappings: Private mappings for hasVoted and lastCreated to prevent unnecessary data exposure.
Data Types: Use of uint256 instead of uint to ensure consistency and potentially optimize gas usage.
Test Coverage
A comprehensive test file has been created to ensure all contract functionalities work as expected. The test suite covers:

Creation of voting sessions
Starting and ending voting sessions
Voting process
Determination of the winner
Edge cases and error handling
How to Use
Deploy the Contract

Deploy the VotingContract to an Ethereum-compatible blockchain.
Create a Voting Session

Call createVotingSession with an array of movie names.
Start Voting

Use startVoting with the session ID and duration for the voting period.
Cast Votes

Call vote with the session ID and the movie name.
End Voting

Invoke endVoting when the voting period is over.
Check Results

Retrieve the list of movies and the winner using getMovies and getWinner.
For detailed testing and usage examples, refer to the provided test file.
