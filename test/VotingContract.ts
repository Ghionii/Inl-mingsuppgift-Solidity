import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('VotingContract', function () {
  async function deployVotingContractFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const VotingContract = await ethers.getContractFactory('VotingContract');
    const votingContract = await VotingContract.deploy();

    return { owner, addr1, addr2, votingContract };
  }

  describe('Deployment', function () {
    it('Should deploy the contract with 0 sessions', async function () {
      const { votingContract } = await deployVotingContractFixture();

      const sessionCounter = await votingContract.sessionCounter();
      expect(sessionCounter).to.equal(0);
    });
  });

  describe('CreateVotingSession', function () {
    it('Should create a votingSession with atleast 2 movies with the correct names', async function () {
      const { votingContract, owner } = await deployVotingContractFixture();

      await votingContract.createVotingSession(['Movie1', 'Movie2']);

      const sessionCounter = await votingContract.sessionCounter();
      expect(sessionCounter).to.equal(1);

      const movies = await votingContract.getMovies(1);
      expect(movies.length).to.equal(2);

      expect(movies[0].name).to.equal('Movie1');
      expect(movies[1].name).to.equal('Movie2');
    });

    it('Should create a votingSessions with more than 2 movies correctly', async function () {
      const { votingContract } = await deployVotingContractFixture();
      await votingContract.createVotingSession(['Movie1', 'Movie2', 'Movie3']);
      const sessionCounter = await votingContract.sessionCounter();
      const movies = await votingContract.getMovies(sessionCounter);
      expect(movies.length).to.equal(3);
    });

    it('Should reject if user only inputs one movie', async function () {
      const { votingContract, owner } = await deployVotingContractFixture();

      await expect(
        votingContract.createVotingSession(['Movie1'])
      ).to.be.rejectedWith('You must pick at least 2 movies');
    });
  });

  describe('StartVoting', function () {
    it('Should start the voting session with the sessionId and duration and create a event that the voting session has started', async function () {
      const { votingContract, owner } = await deployVotingContractFixture();

      await votingContract.createVotingSession(['Movie1', 'Movie2']);

      const sessionCounter = await votingContract.sessionCounter();
      const sessionId = sessionCounter.valueOf();

      const duration = 100;

      await expect(votingContract.startVoting(sessionId, duration))
        .to.emit(votingContract, 'VoteStarted')
        .withArgs(owner.address, sessionId);

      const session = await votingContract.votingSessions(sessionId);

      expect(session.votingState).to.equal(1);
    });

    it('Should revert if startVoting is called on a session that is already started', async function () {
      const { votingContract, owner } = await deployVotingContractFixture();
      await votingContract.createVotingSession(['Movie1', 'Movie2']);
      const sessionId = (await votingContract.sessionCounter()).valueOf();
      await votingContract.startVoting(sessionId, 100);
      await expect(
        votingContract.startVoting(sessionId, 100)
      ).to.be.revertedWith('Invalid state');
    });

    it('Should reject if the owner isnt the one calling the function', async function () {
      const { votingContract, addr1 } = await deployVotingContractFixture();

      await votingContract.createVotingSession(['Movie1', 'Movie2']);

      const sessionCounter = await votingContract.sessionCounter();
      const sessionId = sessionCounter.valueOf();

      const duration = 100;

      const connectAddr1 = votingContract.connect(addr1);

      await expect(
        connectAddr1.startVoting(sessionId, duration)
      ).to.be.revertedWith('Not the owner');
    });
  });

  describe('Vote', function () {
    it('should let user cast their vote', async function () {
      const { votingContract, owner, addr1, addr2 } =
        await deployVotingContractFixture();

      await votingContract.createVotingSession(['Movie1', 'Movie2']);

      const sessionCounter = await votingContract.sessionCounter();
      const sessionId = sessionCounter.valueOf();

      const duration = 100;
      await votingContract.startVoting(sessionId, duration);

      await votingContract.connect(addr1).vote(sessionId, 'Movie1');

      const session = await votingContract.votingSessions(sessionId);
      const movies = await votingContract.getMovies(sessionId);

      expect(movies[0].voteCount).to.equal(1);
      expect(movies[1].voteCount).to.equal(0);
    });

    it('Should reject if user has already voted', async function () {
      const { votingContract, owner, addr1, addr2 } =
        await deployVotingContractFixture();

      await votingContract.createVotingSession(['Movie1', 'Movie2']);

      const sessionCounter = await votingContract.sessionCounter();
      const sessionId = sessionCounter.valueOf();

      const duration = 100;
      await votingContract.startVoting(sessionId, duration);

      await votingContract.connect(addr1).vote(sessionId, 'Movie1');

      await expect(
        votingContract.connect(addr1).vote(sessionId, 'Movie2')
      ).to.be.revertedWith('You have already voted');
    });

    it('Should reject if duration has ended', async function () {
      const { votingContract, addr1 } = await deployVotingContractFixture();

      await votingContract.createVotingSession(['Movie1', 'Movie2']);

      const sessionCounter = await votingContract.sessionCounter();
      const sessionId = sessionCounter.valueOf();

      const duration = 100;
      await votingContract.startVoting(sessionId, duration);

      await ethers.provider.send('evm_increaseTime', [100]);
      await ethers.provider.send('evm_mine', []);

      await expect(
        votingContract.connect(addr1).vote(sessionId, 'Movie1')
      ).to.be.rejectedWith('Voting has ended');
    });

    it('should reject if the movie does not exist', async function () {
      const { votingContract, addr1 } = await deployVotingContractFixture();

      await votingContract.createVotingSession(['Movie1', 'Movie2']);

      const sessionCounter = await votingContract.sessionCounter();
      const sessionId = sessionCounter.valueOf();

      const duration = 100;
      await votingContract.startVoting(sessionId, duration);

      await expect(votingContract.connect(addr1).vote(sessionId, 'RandomMovie'))
        .to.be.reverted;
    });
  });

  describe('DetermineWinner', function () {
    it('Should count which movie is the winner', async function () {
      const { votingContract, owner, addr1, addr2 } =
        await deployVotingContractFixture();

      await votingContract.createVotingSession(['Movie1', 'Movie2']);

      const sessionCounter = await votingContract.sessionCounter();
      const sessionId = sessionCounter.valueOf();

      const duration = 100;
      await votingContract.startVoting(sessionId, duration);

      await votingContract.connect(addr1).vote(sessionId, 'Movie1');
      await votingContract.connect(addr2).vote(sessionId, 'Movie2');
      await votingContract.connect(owner).vote(sessionId, 'Movie1');

      await ethers.provider.send('evm_increaseTime', [100]);
      await ethers.provider.send('evm_mine', []);

      await votingContract.endVoting(sessionId);

      const winner = await votingContract.getWinner(sessionId);

      expect(winner).to.equal('Movie1');
    });
  });

  describe('endVoting', function () {
    it('Should end the vote if the duration has run out', async function () {
      const { votingContract } = await deployVotingContractFixture();

      await votingContract.createVotingSession(['Movie1', 'Movie2']);

      const sessionCounter = await votingContract.sessionCounter();
      const sessionId = sessionCounter.valueOf();

      const duration = 100;
      await votingContract.startVoting(sessionId, duration);

      await ethers.provider.send('evm_increaseTime', [100]);
      await ethers.provider.send('evm_mine', []);

      await votingContract.endVoting(sessionId);

      const session = await votingContract.votingSessions(sessionId);

      expect(session.votingState).to.equal(2);
    });

    it('Should reject the function if the timer is still going on', async function () {
      const { votingContract } = await deployVotingContractFixture();

      await votingContract.createVotingSession(['Movie1', 'Movie2']);

      const sessionCounter = await votingContract.sessionCounter();
      const sessionId = sessionCounter.valueOf();

      const duration = 100;
      await votingContract.startVoting(sessionId, duration);

      await expect(votingContract.endVoting(sessionId)).to.be.revertedWith(
        'Voting period has not ended yet'
      );
    });
    it('should reject if other than owner is trying to call endVoting', async function () {
      const { votingContract, owner, addr1, addr2 } =
        await deployVotingContractFixture();

      await votingContract.createVotingSession(['Movie1', 'Movie2']);

      const sessionCounter = await votingContract.sessionCounter();
      const sessionId = sessionCounter.valueOf();

      const duration = 100;
      await votingContract.startVoting(sessionId, duration);

      await ethers.provider.send('evm_increaseTime', [100]);
      await ethers.provider.send('evm_mine', []);

      const connectAddr1 = votingContract.connect(addr1);

      await expect(connectAddr1.endVoting(sessionId)).to.be.rejectedWith(
        'Not the owner'
      );
    });
  });

  describe('fallback', function () {
    it('Should revert if a unknown function is being called', async function () {
      const { votingContract, owner } = await deployVotingContractFixture();

      await expect(
        owner.sendTransaction({
          to: votingContract.getAddress(),
          data: '0x0000',
        })
      ).to.be.revertedWith('Fallback function. Call a function that exists!');
    });
  });
});
