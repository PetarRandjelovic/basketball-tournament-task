const fs = require('fs');

const exhibitions = JSON.parse(fs.readFileSync('jsonFiles/exibitions.json', 'utf8'));
const groups = JSON.parse(fs.readFileSync('jsonFiles/groups.json', 'utf8'));
const matchHistory = JSON.parse(fs.readFileSync('jsonFiles/matchHistory.json', 'utf8'));

const MatchSimulator = require('./matchSimulator.js');

const matchSimulator = new MatchSimulator(matchHistory);


const saveFile = require('./saveFile.js');

function simulateGroupStage() {
    const standings = {};
    const results = [];
    const matchHistory = [];

    for (let group in groups) {
        let teams = groups[group];
        standings[group] = teams.map(team => ({
            ...team,
            victories: 0,
            defeats: 0,
            points: 0,
            scored: 0,
            conceded: 0,
            difference: 0
        }));

        console.log(`Grupna faza - Grupa ${group}:`);

        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                const result = matchSimulator.simulateMatch(teams[i], teams[j]);

                const match = {
                    group: group,
                    team1: teams[i].Team,
                    team2: teams[j].Team,
                    team1Score: result.team1Score,
                    team2Score: result.team2Score,
                    winner: result.winner.Team,
                    loser: result.loser.Team,
                    playedInGroup: true
                };

                results.push(match);
                matchHistory.push(match);

                console.log(`\t${teams[i].Team} - ${teams[j].Team} (${result.team1Score}:${result.team2Score})`);

                const winner = standings[group].find(team => team.ISOCode === result.winner.ISOCode);
                const loser = standings[group].find(team => team.ISOCode === result.loser.ISOCode);

                winner.victories += 1;
                winner.points += 2;
                winner.scored += result.team1Score > result.team2Score ? result.team1Score : result.team2Score;
                winner.conceded += result.team1Score > result.team2Score ? result.team2Score : result.team1Score;
                winner.difference = winner.scored - winner.conceded;

                loser.defeats += 1;
                loser.points += 1;
                loser.scored += result.team1Score > result.team2Score ? result.team2Score : result.team1Score;
                loser.conceded += result.team1Score > result.team2Score ? result.team1Score : result.team2Score;
                loser.difference = loser.scored - loser.conceded;
            }
        }
    }

    saveExhibitionsMatches(matchHistory);
    saveFile(matchHistory, 'jsonFiles/matchHistory.json');
    saveFile(results, 'jsonFiles/simulation_results.json');

    displayFinalStandings(standings, results);
}

function saveExhibitionsMatches(matchHistory) {
    for (const team in exhibitions) {
        exhibitions[team].forEach(exhibition => {
            const [team1Score, team2Score] = exhibition.Result.split('-').map(Number);
            const opponent = exhibition.Opponent;

            const match = {
                team1: team,
                team2: opponent,
                team1Score: team1Score,
                team2Score: team2Score,
                winner: team1Score > team2Score ? team : opponent,
                loser: team1Score > team2Score ? opponent : team,
                playedInGroup: false
            };

            matchHistory.push(match);
        });
    }
}

function compareTeamsWithSamePoints(group, tiedTeams, results) {
    if (tiedTeams.length === 2) {
        return compareTwoTeamsWithSamePoints(group, tiedTeams[0], tiedTeams[1], results);
    } else {
        return compareThreeTeamsWithSamePoints(group, tiedTeams, results);
    }
}

function displayFinalStandings(standings, results) {
    console.log("\nKonačan plasman u grupama:");
    for (let group in standings) {
        console.log(`  Grupa ${group}: Ime - pobede/porazi/bodovi/postignuti koševi/primljeni koševi/koš razlika`);

        standings[group].sort((a, b) => {
            if (b.points !== a.points) {
                return b.points - a.points;
            }
            const tiedTeams = standings[group].filter(team => team.points === a.points);
            console.log(tiedTeams.length);
            if (tiedTeams.length === 2) {
                const sortedTiedTeams = compareTeamsWithSamePoints(group, tiedTeams, results);

                return sortedTiedTeams;
            } else if (tiedTeams.length === 3) {
                const sortedTiedTeams = compareTeamsWithSamePoints(group, tiedTeams, results);
                return sortedTiedTeams.indexOf(a) - sortedTiedTeams.indexOf(b);
            }

            return 0;
        });

        standings[group].forEach((team, index) => {
            console.log(`    ${index + 1}. ${team.Team}  ${team.victories} / ${team.defeats} / ${team.points} / ${team.scored} / ${team.conceded} / ${team.difference > 0 ? '+' : ''}${team.difference}`);
        });
    }

    const standingsData = Object.keys(standings).map(group => ({
        group: group,
        teams: standings[group].map((team, index) => ({
            rank: index + 1,
            team: team.Team,
            isoCode: team.ISOCode,
            victories: team.victories,
            defeats: team.defeats,
            points: team.points,
            scored: team.scored,
            conceded: team.conceded,
            difference: team.difference,
            group: team.group
        }))
    }));

    saveFile(standingsData, 'jsonFiles/group_standings.json')
}

function compareThreeTeamsWithSamePoints(group, tiedTeams, results) {

    const headToHeadScores = tiedTeams.map(team => {
        let scoreDifference = 0;

        tiedTeams.forEach(opponent => {
            if (team !== opponent) {
                const match = results.find(match =>
                    match.group === group &&
                    ((match.team1 === team.Team && match.team2 === opponent.Team) ||
                        (match.team1 === opponent.Team && match.team2 === team.Team))
                );

                if (match) {
                    if (match.team1 === team.Team) {
                        scoreDifference += (match.team1Score - match.team2Score);
                    } else {
                        scoreDifference += (match.team2Score - match.team1Score);
                    }
                }
            }
        });

        return {
            team: team,
            scoreDifference: scoreDifference
        };
    });


    headToHeadScores.sort((a, b) => b.scoreDifference - a.scoreDifference);


    return headToHeadScores.map(entry => entry.team);
}


function compareTwoTeamsWithSamePoints(group, a, b, results) {
    const headToHeadMatch = results.find(match =>
        match.group === group &&
        ((match.team1 === a.Team && match.team2 === b.Team) ||
            (match.team1 === b.Team && match.team2 === a.Team))
    );

    if (headToHeadMatch) {
        if (headToHeadMatch.winner === a.Team) {
            return 1;
        } else if (headToHeadMatch.winner === b.Team) {
            return -1;
        }
    }

    return 0;
}


simulateGroupStage();


function rankAndSortAllTeams(standings) {
    const rankedTeams = [];

    const firstRanked = [];
    const secondRanked = [];
    const thirdRanked = [];

    standings.forEach(group => {
        group.teams.sort((a, b) => {
            if (b.points !== a.points) {
                return b.points - a.points;
            }
            if (b.difference !== a.difference) {
                return b.difference - a.difference;
            }
            if (b.scored !== a.scored) {
                return b.scored - a.scored;
            }
            return a.FIBARanking - b.FIBARanking;
        });

        firstRanked.push(group.teams[0]);
        secondRanked.push(group.teams[1]);
        thirdRanked.push(group.teams[2]);
    });

    const sortTeams = (teams) => {
        return teams.sort((a, b) => {
            if (b.points !== a.points) {
                return b.points - a.points;
            }
            if (b.difference !== a.difference) {
                return b.difference - a.difference;
            }
            if (b.scored !== a.scored) {
                return b.scored - a.scored;
            }
            return a.FIBARanking - b.FIBARanking;
        });
    };

    const sortedFirstRanked = sortTeams(firstRanked);
    const sortedSecondRanked = sortTeams(secondRanked);
    const sortedThirdRanked = sortTeams(thirdRanked);

    rankedTeams.push(...sortedFirstRanked, ...sortedSecondRanked, ...sortedThirdRanked);

    rankedTeams.forEach((team, index) => {
        team.rank = index + 1;

        for (let group in groups) {
            let teams = groups[group];
            for (let i = 0; i < teams.length; i++) {
                if (teams[i].Team === team.team) {
                    team.FIBARanking = teams[i].FIBARanking;
                    break;
                }
            }
        }
    });

    return rankedTeams;
}

const groupStandings = JSON.parse(fs.readFileSync('jsonFiles/group_standings.json', 'utf8'));

const sortedAllTeams = rankAndSortAllTeams(groupStandings);

console.log("Overall sorted teams:");
sortedAllTeams.forEach((team, index) => {

    console.log(`${team.rank}. ${team.team} - Poeni: ${team.points}, Razlika: ${team.difference}, Kosevi: ${team.scored}, FIBA Ranking: ${team.FIBARanking} Grupa ${team.group}`);

});

saveFile(sortedAllTeams, 'jsonFiles/sorted_all_teams.json')

simulatingEliminationRounds(sortedAllTeams);


function simulatingEliminationRounds(sortedAllTeams) {

    const groupedTeams = {
        D: sortedAllTeams.filter(team => team.rank <= 2),
        E: sortedAllTeams.filter(team => team.rank > 2 && team.rank <= 4),
        F: sortedAllTeams.filter(team => team.rank > 4 && team.rank <= 6),
        G: sortedAllTeams.filter(team => team.rank > 6 && team.rank <= 8)
    };

    const bracket = createEliminationRounds(groupedTeams);
    let quarterFinalResults = [];
    console.log("Cetvrt finale!\n");
    bracket.forEach(match => {
        const matchResult = matchSimulator.simulateMatchElimenationRound(match.team1, match.team2, match.team1Hat, match.team2Hat);
        console.log(`Winner: ${matchResult.winner.team} (Team 1: ${matchResult.team1.team} ${matchResult.team1Score} - Team 2: ${matchResult.team2.team} ${matchResult.team2Score}) hat ${matchResult.hat}`);
        quarterFinalResults.push(matchResult);
    });
    console.log("Polu finale!\n");
    let hatMap = {};
    let halfinals = [];
    quarterFinalResults.forEach(match1 => {
        const hat = match1.hat;

        if (hatMap[hat]) {
            const matchResult = matchSimulator.simulateMatchElimenationRound(match1.team1, match1.team2, match1.hat, match1.hat);
            halfinals.push(matchResult);
        } else {
            hatMap[hat] = match1.winner;
        }
    });
    halfinals.forEach(match1 => {
        console.log(match1.winner.team)
    });

    console.log("Finali!")


    const finalMatch = matchSimulator.simulateMatchElimenationRound(halfinals[0].winner, halfinals[1].winner, halfinals[0].hat, halfinals[1].hat);

    const thirdPlaceMatch = matchSimulator.simulateMatchElimenationRound(halfinals[0].loser, halfinals[1].loser, halfinals[0].hat, halfinals[1].hat);


    console.log(`\n ${finalMatch.team1.team} ${finalMatch.team1Score}-${finalMatch.team2Score} ${finalMatch.team2.team}`);

    console.log("Za trece mesto")
    console.log(`${thirdPlaceMatch.team1.team} ${thirdPlaceMatch.team1Score}-${thirdPlaceMatch.team2Score} ${thirdPlaceMatch.team2.team}`);

    console.log("Medalje")
    console.log(` 1. ${finalMatch.winner.team} \n 2. ${finalMatch.loser.team} \n 3. ${thirdPlaceMatch.winner.team}`);

}


function createEliminationRounds(groupedTeams) {
    const eliminationMatches = [];

    const matchTeams = (hat1, hat2) => {
        if (groupedTeams[hat1][0].group != groupedTeams[hat2][0].group) {
            eliminationMatches.push({
                team1: groupedTeams[hat1][0],
                team2: groupedTeams[hat2][0],
                team1Hat: hat1,
                team2Hat: hat2,
            });
            eliminationMatches.push({
                team1: groupedTeams[hat1][1],
                team2: groupedTeams[hat2][1],
                team1Hat: hat1,
                team2Hat: hat2,
            });
        } else {
            eliminationMatches.push({
                team1: groupedTeams[hat1][0],
                team2: groupedTeams[hat2][1],
                team1Hat: hat1,
                team2Hat: hat2,
            });
            eliminationMatches.push({
                team1: groupedTeams[hat1][1],
                team2: groupedTeams[hat2][0],
                team1Hat: hat1,
                team2Hat: hat2,
            });
        }
    };

    matchTeams("D", "E");
    matchTeams("G", "F");

    return eliminationMatches;
}


