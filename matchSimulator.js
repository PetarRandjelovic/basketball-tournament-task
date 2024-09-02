
const fs = require('fs');
const exhibitions = JSON.parse(fs.readFileSync('jsonFiles/exibitions.json', 'utf8'));
class MatchSimulator {

    constructor(matchHistory) {
        this.matchHistory = matchHistory;
    }

    simulateMatch(team1, team2) {
        
        const team1Exhibitions = exhibitions[team1.ISOCode] || [];
        const team2Exhibitions = exhibitions[team2.ISOCode] || [];

        let team1Score = (100 - team1.FIBARanking) + Math.random() * 20;
        let team2Score = (100 - team2.FIBARanking) + Math.random() * 20;

        const weight = 0.15;

        team1Exhibitions.forEach(match => {
            if (match.Opponent === team2.ISOCode) {
                let [team1Result, team2Result] = match.Result.split('-').map(Number);
                team1Score += (team1Result - team2Result) * weight;
                team2Score += (team2Result - team1Result) * weight;
            }
        });

        team2Exhibitions.forEach(match => {
            if (match.Opponent === team1.ISOCode) {
                let [team2Result, team1Result] = match.Result.split('-').map(Number);
                team1Score += (team1Result - team2Result) * weight;
                team2Score += (team2Result - team1Result) * weight;
            }
        });

        const result = {
            team1Score: Math.round(team1Score),
            team2Score: Math.round(team2Score),
            winner: team1Score > team2Score ? team1 : team2,
            loser: team1Score > team2Score ? team2 : team1
        };

        return result;
    }

    simulateMatchElimenationRound(team1, team2, hat1, hat2) {
        const team1Exhibitions = [
            ...this.searchByTeam(team1.team) || [],
            ...this.searchByTeam(team1.isoCode) || []
        ];

        const team2Exhibitions = [
            ...this.searchByTeam(team2.team) || [],
            ...this.searchByTeam(team2.isoCode) || []
        ];

        const team1InitialScore = (50 - team1.FIBARanking) + (50 - team1.rank);
        const team2InitialScore = (50 - team2.FIBARanking) + (50 - team2.rank);

        let team1Score = team1InitialScore + Math.random() * 20;
        let team2Score = team2InitialScore + Math.random() * 20;

        const weight = 0.15;

        team1Exhibitions.forEach(match => {
            if (match.team2 === team2.team1 || match.team2 === team2.isoCode) {
                let [team1Result, team2Result] = [match.team1Score, match.team2Score];
                team1Score += (team1Result - team2Result) * weight;
                team2Score += (team2Result - team1Result) * weight;
            }
        });

        team2Exhibitions.forEach(match => {
            if (match.team2 === team1.team1 || match.team2 === team1.isoCode) {
                let [team2Result, team1Result] = [match.team2Score, match.team1Score];
                team1Score += (team1Result - team2Result) * weight;
                team2Score += (team2Result - team1Result) * weight;
            }
        });

        const result = {
            team1: team1,
            team1Score: Math.round(team1Score),
            team2: team2,
            team2Score: Math.round(team2Score),
            winner: team1Score >= team2Score ? team1 : team2,
            loser: team1Score < team2Score ? team1 : team2,
            hat: hat1 + hat2
        };

        return result;
    }

    searchByTeam(team1Name) {
        return this.matchHistory.filter(game => game.team1 === team1Name);
    }

}

module.exports = MatchSimulator; 