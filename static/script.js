const tabHome = document.getElementById('tab-home');
const tabGame = document.getElementById('tab-game');
const tabInfo = document.getElementById('tab-info');

const viewHome = document.getElementById('view-home');
const viewGame = document.getElementById('view-game');
const viewInfo = document.getElementById('view-info');

const gameModeSelect = document.getElementById('game-mode');
const player1AlgoSelect = document.getElementById('player1-algo');
const player2AlgoSelect = document.getElementById('player2-algo');
const player1AlgoGroup = document.getElementById('player1-algo-group');
const player2AlgoLabel = document.getElementById('player2-algo-label');

const gridSizeSelect = document.getElementById('grid-size');
const difficultySelect = document.getElementById('difficulty');
const balancedSpawnCheckbox = document.getElementById('balanced-spawn');
const showHintCheckbox = document.getElementById('show-hint');
const hintControlWrapper = document.getElementById('hint-control-wrapper');

const btnStartGame = document.getElementById('btn-start-game');
const btnReset = document.getElementById('btn-reset');
const btnPlayTurn = document.getElementById('btn-play-turn');
const btnAutoPlay = document.getElementById('btn-auto-play');
const keyboardHint = document.getElementById('keyboard-hint');
const gameGrid = document.getElementById('game-grid');
const winnerAlert = document.getElementById('winner-alert');

const p1NameDisplay = document.getElementById('p1-name-display');
const p2NameDisplay = document.getElementById('p2-name-display');
const p1Moves = document.getElementById('p1-moves');
const p1Nodes = document.getElementById('p1-nodes');
const p1Time = document.getElementById('p1-time');
const p2Moves = document.getElementById('p2-moves');
const p2Nodes = document.getElementById('p2-nodes');
const p2Time = document.getElementById('p2-time');

const xaiActiveTurn = document.getElementById('xai-active-turn');
const xaiAlgo = document.getElementById('xai-algo');
const xaiPathLen = document.getElementById('xai-path-len');
const xaiReasoning = document.getElementById('xai-reasoning');
const cspVisual = document.getElementById('csp-visual');

let grid = [];
let player1Pos = [0, 0];
let player2Pos = [7, 7];
let treasurePos = [0, 0];
let activeTurn = 1;
let movesCount = { p1: 0, p2: 0 };
let nodesCount = { p1: 0, p2: 0 };
let solveTime = { p1: 0, p2: 0 };
let isGameOver = false;
let isAutoPlaying = false;
let autoPlayInterval = null;
let lastPath = [];
let lastVisited = [];
let humanHintPath = [];

let p1PathHistory = [];
let p2PathHistory = [];
let p1VisitedAll = [];
let p2VisitedAll = [];
let player1Start = [0, 0];
let player2Start = [7, 7];

function switchView(activeTab, activeView) {
    [tabHome, tabGame, tabInfo].forEach(btn => btn.classList.remove('active'));
    [viewHome, viewGame, viewInfo].forEach(view => view.classList.remove('active'));
    activeTab.classList.add('active');
    activeView.classList.add('active');
    if (isAutoPlaying && activeView !== viewGame) {
        stopAutoPlay();
    }
}

tabHome.addEventListener('click', () => switchView(tabHome, viewHome));
tabGame.addEventListener('click', () => switchView(tabGame, viewGame));
tabInfo.addEventListener('click', () => switchView(tabInfo, viewInfo));

gameModeSelect.addEventListener('change', () => {
    const mode = gameModeSelect.value;
    if (mode === 'human-ai') {
        player1AlgoSelect.innerHTML = '<option value="manual">Manual Arrow Controls</option>';
        player1AlgoSelect.disabled = true;
        player2AlgoLabel.textContent = 'Player 2 (AI) Algorithm';
    } else {
        player1AlgoSelect.innerHTML = `
            <option value="astar">A* Search</option>
            <option value="bfs">Breadth-First Search (BFS)</option>
            <option value="dfs">Depth-First Search (DFS)</option>
            <option value="greedy">Greedy Best-First Search</option>
        `;
        player1AlgoSelect.disabled = false;
        player2AlgoLabel.textContent = 'Player 2 (AI) Algorithm';
    }
});

btnStartGame.addEventListener('click', () => {
    initGame();
});

btnReset.addEventListener('click', () => {
    initGame();
});

btnPlayTurn.addEventListener('click', () => {
    if (isGameOver) return;
    executeTurn();
});

btnAutoPlay.addEventListener('click', () => {
    if (isGameOver) return;
    if (isAutoPlaying) {
        stopAutoPlay();
    } else {
        startAutoPlay();
    }
});

showHintCheckbox.addEventListener('change', () => {
    if (showHintCheckbox.checked) {
        fetchHumanHint();
    } else {
        humanHintPath = [];
        drawGrid();
    }
});

function fetchHumanHint() {
    if (isGameOver) return;
    if (gameModeSelect.value !== 'human-ai') return;
    if (activeTurn !== 1) {
        humanHintPath = [];
        drawGrid();
        return;
    }
    if (!showHintCheckbox.checked) {
        humanHintPath = [];
        drawGrid();
        return;
    }
    fetch('/api/get_move', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            grid: grid,
            start: player1Pos,
            goal: treasurePos,
            algorithm: 'bfs'
        })
    })
    .then(res => res.json())
    .then(data => {
        humanHintPath = data.path || [];
        drawGrid();
    });
}

function startAutoPlay() {
    isAutoPlaying = true;
    btnAutoPlay.textContent = 'Pause Game';
    btnAutoPlay.classList.add('btn-secondary');
    btnAutoPlay.classList.remove('btn-accent');
    autoPlayInterval = setInterval(() => {
        if (!isGameOver) {
            executeTurn();
        } else {
            stopAutoPlay();
        }
    }, 800);
}

function stopAutoPlay() {
    isAutoPlaying = false;
    btnAutoPlay.textContent = 'Auto Play';
    btnAutoPlay.classList.remove('btn-secondary');
    btnAutoPlay.classList.add('btn-accent');
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
    }
}

function initGame() {
    stopAutoPlay();
    
    const gridSize = parseInt(gridSizeSelect.value) || 8;
    const difficulty = difficultySelect.value || 'medium';
    const balancedSpawn = balancedSpawnCheckbox.checked;
    
    fetch('/api/init_game', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            grid_size: gridSize,
            difficulty: difficulty,
            balanced_spawn: balancedSpawn
        })
    })
    .then(res => res.json())
    .then(data => {
        grid = data.grid;
        player1Pos = data.player1_start;
        player2Pos = data.player2_start;
        player1Start = [...data.player1_start];
        player2Start = [...data.player2_start];
        treasurePos = data.treasure;
        activeTurn = Math.random() < 0.5 ? 1 : 2;
        isGameOver = false;
        lastPath = [];
        lastVisited = [];
        humanHintPath = [];
        
        p1PathHistory = [ [...player1Pos] ];
        p2PathHistory = [ [...player2Pos] ];
        p1VisitedAll = [];
        p2VisitedAll = [];
        
        movesCount = { p1: 0, p2: 0 };
        nodesCount = { p1: 0, p2: 0 };
        solveTime = { p1: 0, p2: 0 };
        
        const isP1Human = gameModeSelect.value === 'human-ai';
        const p1Algo = player1AlgoSelect.value;
        const p2Algo = player2AlgoSelect.value;
        
        const algoMap = {
            'manual': 'Manual',
            'bfs': 'BFS',
            'dfs': 'DFS',
            'greedy': 'Greedy',
            'astar': 'A*'
        };

        p1NameDisplay.textContent = isP1Human ? 'Player 1 (Human)' : `Player 1 (AI) - ${algoMap[p1Algo] || p1Algo.toUpperCase()}`;
        p2NameDisplay.textContent = `Player 2 (AI) - ${algoMap[p2Algo] || p2Algo.toUpperCase()}`;
        
        if (isP1Human) {
            keyboardHint.classList.remove('hidden');
            hintControlWrapper.classList.remove('hidden');
            if (activeTurn === 1) {
                fetchHumanHint();
            }
        } else {
            keyboardHint.classList.add('hidden');
            hintControlWrapper.classList.add('hidden');
        }
        
        winnerAlert.classList.add('hidden');
        winnerAlert.className = 'winner-alert hidden';
        
        const waPanel = document.getElementById('winner-analysis-panel');
        if (waPanel) {
            waPanel.classList.add('hidden');
        }
        
        updateStats();
        drawGrid();
        
        xaiActiveTurn.textContent = '-';
        xaiAlgo.textContent = '-';
        xaiPathLen.textContent = '-';
        xaiReasoning.textContent = 'Game initialized. Take a step or press Auto Play.';
        cspVisual.innerHTML = '';
        
        switchView(tabGame, viewGame);
        
        saveAnalyticsData();
        
        if (activeTurn === 2 && isP1Human) {
            xaiActiveTurn.textContent = 'Player 2 (AI) starts...';
            setTimeout(() => {
                executeTurn();
            }, 800);
        }
    });
}

function drawGrid() {
    gameGrid.innerHTML = '';
    gameGrid.style.setProperty('--grid-size', grid.length);
    
    const size = grid.length;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            
            if (grid[r][c] === 1) {
                cell.classList.add('obstacle');
            }
            if (r === treasurePos[0] && c === treasurePos[1]) {
                cell.classList.add('treasure');
            }
            
            const isP1 = r === player1Pos[0] && c === player1Pos[1];
            const isP2 = r === player2Pos[0] && c === player2Pos[1];
            
            if (isP1) {
                cell.classList.add('player1');
                if (gameModeSelect.value === 'human-ai') {
                    cell.classList.add('player1-human');
                }
            } else if (isP2) {
                cell.classList.add('player2');
            }
            
            if (!isP1 && !isP2) {
                const inHint = showHintCheckbox.checked && humanHintPath.some(pos => pos[0] === r && pos[1] === c);
                if (inHint) {
                    cell.classList.add('hint-path');
                } else {
                    const pathClass = activeTurn === 1 ? 'path-p1' : 'path-p2';
                    const visitClass = activeTurn === 1 ? 'visited-p1' : 'visited-p2';
                    
                    const inPath = lastPath.some(pos => pos[0] === r && pos[1] === c);
                    const inVisited = lastVisited.some(pos => pos[0] === r && pos[1] === c);
                    
                    if (inPath) {
                        cell.classList.add(pathClass);
                    } else if (inVisited) {
                        cell.classList.add(visitClass);
                    }
                }
            }
            
            gameGrid.appendChild(cell);
        }
    }
}

function formatRuntime(ms) {
    if (ms > 0 && ms < 0.000001) return "< 0.000001 ms";
    return ms.toFixed(6) + ' ms';
}

function updateStats() {
    p1Moves.textContent = movesCount.p1;
    p1Nodes.textContent = nodesCount.p1;
    p1Time.textContent = formatRuntime(solveTime.p1);
    
    p2Moves.textContent = movesCount.p2;
    p2Nodes.textContent = nodesCount.p2;
    p2Time.textContent = formatRuntime(solveTime.p2);
}

function executeTurn() {
    if (isGameOver) return;
    
    if (activeTurn === 1) {
        const algo = player1AlgoSelect.value;
        if (algo === 'manual') {
            return;
        }
        fetchMove(player1Pos, treasurePos, algo, 1);
    } else {
        const algo = player2AlgoSelect.value;
        fetchMove(player2Pos, treasurePos, algo, 2);
    }
}

function fetchMove(startPos, goalPos, algorithm, playerNum) {
    fetch('/api/get_move', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            grid: grid,
            start: startPos,
            goal: goalPos,
            algorithm: algorithm
        })
    })
    .then(res => res.json())
    .then(data => {
        lastPath = data.path || [];
        lastVisited = data.visited || [];
        
        // Add to total unique visited coordinates
        lastVisited.forEach(v => {
            const targetList = playerNum === 1 ? p1VisitedAll : p2VisitedAll;
            const exists = targetList.some(pos => pos[0] === v[0] && pos[1] === v[1]);
            if (!exists) {
                targetList.push(v);
            }
        });
        
        nodesCount[playerNum === 1 ? 'p1' : 'p2'] += lastVisited.length;
        solveTime[playerNum === 1 ? 'p1' : 'p2'] = data.execution_time;
        
        xaiActiveTurn.textContent = `Player ${playerNum} (${algorithm.toUpperCase()})`;
        xaiAlgo.textContent = algorithm.toUpperCase();
        xaiPathLen.textContent = lastPath.length > 0 ? (lastPath.length - 1) + ' steps' : '0';
        xaiReasoning.textContent = data.reason;
        
        renderCSPVisualizer(data.valid_moves, data.forward_checking);
        
        if (data.chosen_move) {
            if (playerNum === 1) {
                player1Pos = data.chosen_move;
                movesCount.p1++;
                p1PathHistory.push([...player1Pos]);
            } else {
                player2Pos = data.chosen_move;
                movesCount.p2++;
                p2PathHistory.push([...player2Pos]);
            }
        }
        
        updateStats();
        drawGrid();
        
        checkWinCondition();
        saveAnalyticsData();
        
        if (!isGameOver) {
            activeTurn = playerNum === 1 ? 2 : 1;
            if (activeTurn === 1 && gameModeSelect.value === 'human-ai') {
                stopAutoPlay();
                fetchHumanHint();
            }
        }
    });
}

function renderCSPVisualizer(validMoves, forwardChecking) {
    cspVisual.innerHTML = '';
    const directions = [
        { name: 'Up', offset: [-1, 0] },
        { name: 'Down', offset: [1, 0] },
        { name: 'Left', offset: [0, -1] },
        { name: 'Right', offset: [0, 1] }
    ];
    
    directions.forEach(dir => {
        const node = document.createElement('div');
        node.classList.add('csp-node');
        
        const row = (activeTurn === 1 ? player1Pos[0] : player2Pos[0]) + dir.offset[0];
        const col = (activeTurn === 1 ? player1Pos[1] : player2Pos[1]) + dir.offset[1];
        
        const key = `${row},${col}`;
        const isValid = validMoves.some(m => m[0] === row && m[1] === col);
        
        if (isValid) {
            const hasPath = forwardChecking[key];
            if (hasPath) {
                node.classList.add('valid');
                node.innerHTML = `<strong>${dir.name}</strong><br>Valid (Path OK)`;
            } else {
                node.classList.add('pruned');
                node.innerHTML = `<strong>${dir.name}</strong><br>Pruned (Dead-end)`;
            }
        } else {
            node.classList.add('pruned');
            node.innerHTML = `<strong>${dir.name}</strong><br>Invalid (Obstacle/Bound)`;
        }
        
        cspVisual.appendChild(node);
    });
}

function checkWinCondition() {
    if (player1Pos[0] === treasurePos[0] && player1Pos[1] === treasurePos[1]) {
        isGameOver = true;
        winnerAlert.textContent = `${p1NameDisplay.textContent} found the treasure and wins the battle!`;
        winnerAlert.classList.remove('hidden');
        winnerAlert.classList.add('p1-win');
        stopAutoPlay();
        showWinnerAnalysis(1);
    } else if (player2Pos[0] === treasurePos[0] && player2Pos[1] === treasurePos[1]) {
        isGameOver = true;
        winnerAlert.textContent = `${p2NameDisplay.textContent} found the treasure and wins the battle!`;
        winnerAlert.classList.remove('hidden');
        winnerAlert.classList.add('p2-win');
        stopAutoPlay();
        showWinnerAnalysis(2);
    }
}

window.addEventListener('keydown', (e) => {
    if (isGameOver) return;
    if (activeTurn !== 1 || gameModeSelect.value !== 'human-ai') return;
    
    let dr = 0;
    let dc = 0;
    
    if (e.key === 'ArrowUp') dr = -1;
    else if (e.key === 'ArrowDown') dr = 1;
    else if (e.key === 'ArrowLeft') dc = -1;
    else if (e.key === 'ArrowRight') dc = 1;
    else return;
    
    e.preventDefault();
    
    const nr = player1Pos[0] + dr;
    const nc = player1Pos[1] + dc;
    
    const size = grid.length;
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        if (grid[nr][nc] === 0) {
            player1Pos = [nr, nc];
            movesCount.p1++;
            p1PathHistory.push([...player1Pos]);
            
            // Add manual position to visited list
            const exists = p1VisitedAll.some(pos => pos[0] === nr && pos[1] === nc);
            if (!exists) {
                p1VisitedAll.push([...player1Pos]);
            }
            
            updateStats();
            
            lastPath = [];
            lastVisited = [];
            humanHintPath = [];
            
            xaiActiveTurn.textContent = 'Player 1 (HUMAN)';
            xaiAlgo.textContent = 'MANUAL';
            xaiPathLen.textContent = '-';
            xaiReasoning.textContent = `Human moved manually to (${nr}, ${nc}). Obstacle and grid boundary constraints checked.`;
            
            cspVisual.innerHTML = '';
            
            drawGrid();
            checkWinCondition();
            saveAnalyticsData();
            
            if (!isGameOver) {
                activeTurn = 2;
                setTimeout(() => {
                    executeTurn();
                }, 300);
            }
        }
    }
});

function getTheoreticalFavorite(algo1, algo2) {
    if (algo1 === algo2) {
        const nameMap = {
            'astar': 'A* Search',
            'bfs': 'BFS (Breadth-First Search)',
            'greedy': 'Greedy Best-First Search',
            'dfs': 'DFS (Depth-First Search)',
            'manual': 'Manual Arrow Controls'
        };
        return {
            name: nameMap[algo1] || algo1.toUpperCase(),
            algo: algo1,
            isEqual: true
        };
    }
    
    const rank = { 'astar': 4, 'bfs': 3, 'greedy': 2, 'dfs': 1, 'manual': 0 };
    const r1 = rank[algo1] || 0;
    const r2 = rank[algo2] || 0;
    
    const favAlgo = r1 > r2 ? algo1 : algo2;
    const nameMap = {
        'astar': 'A* Search',
        'bfs': 'BFS (Breadth-First Search)',
        'greedy': 'Greedy Best-First Search',
        'dfs': 'DFS (Depth-First Search)',
        'manual': 'Manual Arrow Controls'
    };
    
    return {
        name: nameMap[favAlgo],
        algo: favAlgo,
        isEqual: false
    };
}

function generateWinnerExplanation(winnerNum, p1Algo, p2Algo, favInfo) {
    const winnerAlgo = winnerNum === 1 ? p1Algo : p2Algo;
    const loserAlgo = winnerNum === 1 ? p2Algo : p1Algo;
    const winnerMoves = winnerNum === 1 ? movesCount.p1 : movesCount.p2;
    const loserMoves = winnerNum === 1 ? movesCount.p2 : movesCount.p1;
    const winnerNodes = winnerNum === 1 ? nodesCount.p1 : nodesCount.p2;
    const loserNodes = winnerNum === 1 ? nodesCount.p2 : nodesCount.p1;
    
    const balanced = balancedSpawnCheckbox.checked;
    
    let reason = "";
    let insight = "";
    
    if (favInfo.isEqual) {
        if (balanced) {
            reason = `Both players ran the same algorithm (${favInfo.name}) on a map with Balanced Spawn. They started at the exact same path distance to the treasure. In this symmetrical setup, the winner was decided by turn execution priority. Player ${winnerNum} got the first turn or executed their steps more optimally along the paths, securing the win on the final step before the other player could reach the goal.`;
            insight = `When path distances and algorithms are identical, first-mover turn execution becomes the deciding factor. Since turn initialization is randomized at start, both players had a mathematically equal chance of winning.`;
        } else {
            reason = `Both players ran the same algorithm (${favInfo.name}), but Balanced Spawn was disabled. Player ${winnerNum} was generated closer to the treasure and required only ${winnerMoves} steps to reach it, whereas Player ${winnerNum === 1 ? 2 : 1} had a starting path of ${loserMoves} steps.`;
            insight = `Without balanced spawn constraints, layout symmetry is lost. Even identical algorithms will result in unequal game outcomes because one starting node is geographically closer to the target.`;
        }
    } else {
        const favWinner = (winnerNum === 1 && favInfo.algo === p1Algo) || (winnerNum === 2 && favInfo.algo === p2Algo);
        
        if (favWinner) {
            if (winnerAlgo === 'astar') {
                reason = `A* Search won as expected by search theory. By evaluating nodes using f(n) = g(n) + h(n), A* balanced path cost and heuristic guidance. It found the optimal path of ${winnerMoves} steps while exploring only ${winnerNodes} nodes, demonstrating much greater search efficiency compared to Player ${winnerNum === 1 ? 2 : 1}'s use of ${algoMapName(loserAlgo)} which visited ${loserNodes} nodes.`;
                insight = `A* combines the optimality of BFS with the heuristic focus of Greedy. This allows it to ignore large portions of the search space that lead away from the treasure, completing the task with minimal node expansion.`;
            } else if (winnerAlgo === 'bfs') {
                reason = `BFS won by guaranteeing the shortest path in this unweighted grid. It successfully mapped out a ${winnerMoves}-step route. While it visited a large number of nodes (${winnerNodes}) due to level-by-level scanning, it outpaced Player ${winnerNum === 1 ? 2 : 1}'s use of ${algoMapName(loserAlgo)}, which followed suboptimal branches.`;
                insight = `In unweighted grids, BFS is optimal for path length. Even though it is blind and explores broadly, it will always find the shortest path first. Algorithms like DFS or Greedy can get distracted by heuristics or stack depth and follow winding, suboptimal paths.`;
            } else if (winnerAlgo === 'greedy') {
                reason = `Greedy Best-First Search won by using Manhattan heuristic distance to drive directly toward the treasure. It took a path of ${winnerMoves} steps, visiting ${winnerNodes} nodes. It was faster than Player ${winnerNum === 1 ? 2 : 1}'s use of ${algoMapName(loserAlgo)} because its greedy heuristic alignment worked well with this obstacle configuration.`;
                insight = `Greedy Best-First is highly focused on the target coordinates. When obstacles are sparse or do not create deep dead-ends, it behaves like a heat-seeking missile and reaches the goal extremely quickly, although it does not guarantee path optimality.`;
            }
        } else {
            if (winnerAlgo === 'bfs' && loserAlgo === 'astar') {
                reason = `Although A* is usually more node-efficient, both BFS and A* guarantee the shortest path in an unweighted grid. Because Balanced Spawn was active, both algorithms computed the optimal ${winnerMoves}-step route. Player ${winnerNum} won solely due to turn order execution priority. A* explored fewer nodes (${loserNodes} vs ${winnerNodes}), but BFS executed its final step first.`;
                insight = `In unweighted arenas, A* and BFS have the same optimal step-count. A* is 'better' because it does less CPU work (visiting fewer nodes), but in a turn-based race, the player who executes first wins if path lengths are identical.`;
            } else if (winnerAlgo === 'greedy' && loserAlgo === 'astar') {
                reason = `Greedy Best-First Search defeated the theoretical favorite A*. In this specific layout, the greedy heuristic estimates pointed directly along the optimal path without hitting any traps. Since Greedy is computationally fast and reached the goal in ${winnerMoves} steps, it outperformed A* which spent time checking alternative paths.`;
                insight = `Greedy Best-First can beat A* when the straight-line heuristic matches the actual traversable path. Greedy operates without checking actual step cost g(n), making it faster under ideal layouts, whereas A* evaluates alternate routes to guarantee optimality.`;
            } else if (winnerAlgo === 'dfs') {
                reason = `Theoretical Favorite: ${favInfo.name}. Surprisingly, DFS won this battle! Because of the unique obstacle placement, the first branch DFS explored using LIFO stack depth happened to lead directly towards the treasure in ${winnerMoves} steps. BFS/A* spent turns exploring other directions level-by-level, allowing DFS to land on the goal first by luck.`;
                insight = `DFS is generally non-optimal and poor for racing. However, if the depth-first search happens to pop the successful path first due to neighbor ordering, it can discover the goal in fewer node visits than systematic, optimal algorithms.`;
            } else if (winnerAlgo === 'manual') {
                reason = `The human player defeated the AI! Using manual controls, the human successfully navigated around the obstacle barriers and reached the treasure in ${winnerMoves} steps, outperforming the AI's algorithm.`;
                insight = `Human cognitive planning can adapt dynamically to complex grid layouts. When using path hints, the human combines computerized search optimality with manual decision-making.`;
            } else {
                reason = `Player ${winnerNum} (${winnerAlgo.toUpperCase()}) won because the map's layout and obstacle structure favored its exploration strategy over the theoretical favorite ${favInfo.name}. It completed the task in ${winnerMoves} steps.`;
                insight = `No single pathfinding algorithm is superior in every possible environment. The performance of heuristics is heavily dependent on map topology and obstacle density.`;
            }
        }
    }
    
    return { reason, insight };
}

function algoMapName(algo) {
    const algoMap = {
        'manual': 'Manual Controls',
        'bfs': 'BFS (Breadth-First)',
        'dfs': 'DFS (Depth-First)',
        'greedy': 'Greedy Best-First',
        'astar': 'A* Search'
    };
    return algoMap[algo] || algo.toUpperCase();
}

function showWinnerAnalysis(winnerNum) {
    const p1Algo = player1AlgoSelect.value;
    const p2Algo = player2AlgoSelect.value;
    const winnerAlgo = winnerNum === 1 ? p1Algo : p2Algo;
    
    const algoMap = {
        'manual': 'Manual Controls',
        'bfs': 'BFS (Breadth-First)',
        'dfs': 'DFS (Depth-First)',
        'greedy': 'Greedy Best-First',
        'astar': 'A* Search'
    };
    
    const isP1Human = gameModeSelect.value === 'human-ai';
    const p1Label = isP1Human ? 'Player 1 (Human)' : `Player 1 (AI) - ${algoMap[p1Algo]}`;
    const p2Label = `Player 2 (AI) - ${algoMap[p2Algo]}`;
    const winnerName = winnerNum === 1 ? p1Label : p2Label;
    
    document.getElementById('wa-winner').textContent = winnerName;
    
    const favInfo = getTheoreticalFavorite(p1Algo, p2Algo);
    document.getElementById('wa-favorite').textContent = favInfo.name;
    
    document.getElementById('wa-p1-path').textContent = movesCount.p1 + ' steps';
    document.getElementById('wa-p1-nodes').textContent = nodesCount.p1;
    document.getElementById('wa-p1-time').textContent = formatRuntime(solveTime.p1);
    
    document.getElementById('wa-p2-path').textContent = movesCount.p2 + ' steps';
    document.getElementById('wa-p2-nodes').textContent = nodesCount.p2;
    document.getElementById('wa-p2-time').textContent = formatRuntime(solveTime.p2);
    
    const explanation = generateWinnerExplanation(winnerNum, p1Algo, p2Algo, favInfo);
    document.getElementById('wa-reason').textContent = explanation.reason;
    document.getElementById('wa-insight').textContent = explanation.insight;
    
    document.getElementById('winner-analysis-panel').classList.remove('hidden');
    saveAnalyticsData();
}

function saveAnalyticsData() {
    if (!grid || grid.length === 0) return;
    
    const p1Algo = player1AlgoSelect.value;
    const p2Algo = player2AlgoSelect.value;
    
    const isP1Win = player1Pos[0] === treasurePos[0] && player1Pos[1] === treasurePos[1];
    const isP2Win = player2Pos[0] === treasurePos[0] && player2Pos[1] === treasurePos[1];
    
    let winnerName = "In Progress";
    if (isP1Win) {
        winnerName = gameModeSelect.value === 'human-ai' ? 'Player 1 (Human)' : `Player 1 (AI) - ${algoMapName(p1Algo)}`;
    } else if (isP2Win) {
        winnerName = `Player 2 (AI) - ${algoMapName(p2Algo)}`;
    }
    
    const countObstacles = () => {
        let count = 0;
        for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[r].length; c++) {
                if (grid[r][c] === 1) count++;
            }
        }
        return count;
    };

    const analyticsData = {
        grid: grid,
        gridSize: grid.length,
        difficulty: difficultySelect.value,
        balancedSpawn: balancedSpawnCheckbox.checked,
        gameMode: gameModeSelect.value,
        player1Algo: p1Algo,
        player2Algo: p2Algo,
        player1Start: player1Start,
        player2Start: player2Start,
        player1Pos: player1Pos,
        player2Pos: player2Pos,
        treasurePos: treasurePos,
        p1PathHistory: p1PathHistory,
        p2PathHistory: p2PathHistory,
        p1VisitedAll: p1VisitedAll,
        p2VisitedAll: p2VisitedAll,
        movesCount: movesCount,
        nodesCount: nodesCount,
        solveTime: solveTime,
        winner: winnerName,
        isGameOver: isGameOver,
        obstaclesCount: countObstacles()
    };
    
    localStorage.setItem('battle_analytics_data', JSON.stringify(analyticsData));
}

const btnAnalytics = document.getElementById('btn-analytics');
if (btnAnalytics) {
    btnAnalytics.addEventListener('click', () => {
        saveAnalyticsData();
        window.location.href = '/analytics';
    });
}

initGame();
