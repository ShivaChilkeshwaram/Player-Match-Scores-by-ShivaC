const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertPlayerDetailsDBToResponseDb = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};

const convertMatchDetailsDBToResponseDb = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};

const convertPlayerMatchScoreDBToResponseDb = (dbObject) => {
  return {
    playerMatchId: dbObject.player_match_id,
    playerId: dbObject.player_id,
    matchId: dbObject.match_id,
    score: dbObject.score,
    fours: dbObject.fours,
    sixes: dbObject.sixes,
  };
};

//API 1 Returns a list of all the players in the player table

app.get("/players/", async (request, response) => {
  const getPlayersListQuery = `
    SELECT * FROM player_details;
    `;
  const playersArray = await db.all(getPlayersListQuery);
  response.send(
    playersArray.map((eachPlayer) =>
      convertPlayerDetailsDBToResponseDb(eachPlayer)
    )
  );
});

//API 2 Returns a specific player based on the player ID

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `
    SELECT * FROM player_details
    WHERE player_id = ${playerId};
    `;
  const player = await db.get(getPlayerQuery);
  response.send(convertPlayerDetailsDBToResponseDb(player));
});

//API 3 Updates the details of a specific player based on the player ID
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerQuery = `
  UPDATE 
    player_details
  SET
    player_name = '${playerName}'
   
  WHERE 
    player_id = ${playerId};
    `;
  await db.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

//API 4 Returns the match details of a specific match
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchDetails = `
    SELECT * FROM match_details
    WHERE match_id = ${matchId};
    `;
  const matchDetails = await db.get(getMatchDetails);
  response.send(convertMatchDetailsDBToResponseDb(matchDetails));
});

//API 5 Returns a list of all the matches of a player
app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerAllMatches = `
  SELECT match_id , match , year FROM player_match_score 
  NATURAL JOIN match_details 
  WHERE player_id = ${playerId};
  `;
  const playerMatches = await db.all(getPlayerAllMatches);
  response.send(
    playerMatches.map((eachMatch) =>
      convertMatchDetailsDBToResponseDb(eachMatch)
    )
  );
});

//API 6 Returns a list of players of a specific match
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getPlayersOfSpecificMatchQuery = `
    SELECT 
    player_match_score.player_id AS playerId, player_name AS playerName FROM 
    player_details INNER JOIN player_match_score ON 
    player_details.player_id = player_match_score.player_id
    WHERE match_id = ${matchId};

    `;
  const specificMatchPlayers = await db.all(getPlayersOfSpecificMatchQuery);
  response.send(specificMatchPlayers);
});

// API 7 Returns the statistics of the total score, fours, sixes of a specific player based on the player ID
app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getStatisticsOfPlayerQuery = `
  SELECT
   player_details.player_id AS playerId , 
  player_details.player_name AS playerName ,
   SUM(player_match_score.score) AS totalScore , 
   SUM(fours) AS totalFours , 
   SUM(sixes) AS totalSixes 
  FROM player_details INNER JOIN player_match_score ON 
  player_details.player_id = player_match_score.player_id 
  WHERE player_details.player_id = ${playerId};
  `;
  const statistics = await db.get(getStatisticsOfPlayerQuery);
  response.send(statistics);
});

module.exports = app;
