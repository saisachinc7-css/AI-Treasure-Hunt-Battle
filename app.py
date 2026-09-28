from flask import Flask, jsonify, request, render_template
import bfs
import dfs
import greedy
import astar
import random
import time

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/analytics")
def analytics():
    return render_template("analytics.html")

@app.route("/api/init_game", methods=["POST"])
def init_game():
    data = request.json or {}
    grid_size = int(data.get("grid_size", 8))
    # Bound grid size to reasonable values
    grid_size = max(5, min(grid_size, 20))
    
    difficulty = data.get("difficulty", "medium")
    density_map = {"easy": 0.15, "medium": 0.25, "hard": 0.35}
    density = density_map.get(difficulty, 0.25)
    
    balanced_spawn = data.get("balanced_spawn", True)
    
    player1_start = (0, 0)
    player2_start = (grid_size - 1, grid_size - 1)
    
    best_grid = None
    best_treasure = None
    best_diff = float("inf")
    
    for attempt in range(500):
        grid = [[0 for _ in range(grid_size)] for _ in range(grid_size)]
        num_obstacles = int(grid_size * grid_size * density)
        
        obstacles = set()
        max_obstacle_attempts = num_obstacles * 3
        obstacle_attempts = 0
        while len(obstacles) < num_obstacles and obstacle_attempts < max_obstacle_attempts:
            r = random.randint(0, grid_size - 1)
            c = random.randint(0, grid_size - 1)
            if (r, c) not in [player1_start, player2_start]:
                obstacles.add((r, c))
            obstacle_attempts += 1
            
        for r, c in obstacles:
            grid[r][c] = 1
            
        # Try to find a treasure cell
        for _ in range(50):
            tr = random.randint(0, grid_size - 1)
            tc = random.randint(0, grid_size - 1)
            if (tr, tc) not in [player1_start, player2_start] and (tr, tc) not in obstacles:
                treasure = (tr, tc)
                
                player1_path = bfs.search(grid, player1_start, treasure)
                player2_path = bfs.search(grid, player2_start, treasure)
                
                if player1_path["path"] and player2_path["path"]:
                    len1 = len(player1_path["path"])
                    len2 = len(player2_path["path"])
                    diff = abs(len1 - len2)
                    
                    if not balanced_spawn:
                        return jsonify({
                            "grid": grid,
                            "player1_start": list(player1_start),
                            "player2_start": list(player2_start),
                            "treasure": [tr, tc]
                        })
                    
                    if diff == 0:
                        return jsonify({
                            "grid": grid,
                            "player1_start": list(player1_start),
                            "player2_start": list(player2_start),
                            "treasure": [tr, tc]
                        })
                    
                    if diff < best_diff:
                        best_diff = diff
                        best_grid = [row[:] for row in grid]
                        best_treasure = [tr, tc]
                        
    if best_grid is not None:
        return jsonify({
            "grid": best_grid,
            "player1_start": list(player1_start),
            "player2_start": list(player2_start),
            "treasure": best_treasure
        })
        
    grid = [[0 for _ in range(grid_size)] for _ in range(grid_size)]
    middle = grid_size // 2
    return jsonify({
        "grid": grid,
        "player1_start": list(player1_start),
        "player2_start": list(player2_start),
        "treasure": [middle, middle]
    })

@app.route("/api/get_move", methods=["POST"])
def get_move():
    data = request.json
    grid = data["grid"]
    start = tuple(data["start"])
    goal = tuple(data["goal"])
    algorithm = data["algorithm"]
    
    if algorithm == "bfs":
        result = bfs.search(grid, start, goal)
    elif algorithm == "dfs":
        result = dfs.search(grid, start, goal)
    elif algorithm == "greedy":
        result = greedy.search(grid, start, goal)
    elif algorithm == "astar":
        result = astar.search(grid, start, goal)
    else:
        return jsonify({"error": "Invalid algorithm"}), 400
        
    path = result["path"]
    visited = result["visited"]
    execution_time = result["execution_time"]
    
    rows = len(grid)
    cols = len(grid[0])
    r, c = start
    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]
    valid_moves = []
    forward_checking = {}
    
    for dr, dc in directions:
        nr, nc = r + dr, c + dc
        if 0 <= nr < rows and 0 <= nc < cols:
            if grid[nr][nc] == 0:
                valid_moves.append([nr, nc])
                test_path = bfs.search(grid, (nr, nc), goal)
                forward_checking[f"{nr},{nc}"] = len(test_path["path"]) > 0
                
    chosen_move = None
    reason = ""
    
    if path and len(path) > 1:
        chosen_move = path[1]
        move_str = f"({chosen_move[0]}, {chosen_move[1]})"
        if algorithm == "bfs":
            reason = f"BFS explored nodes level-by-level to guarantee the shortest path of {len(path)-1} steps. Moving to {move_str} is the optimal next step, and forward checking verified that a valid path to the treasure is preserved from this position."
        elif algorithm == "dfs":
            reason = f"DFS explored paths deeply using a stack. Moving to {move_str} is along the first complete path of {len(path)-1} steps found, and forward checking verified that a valid path to the treasure is preserved from this position."
        elif algorithm == "greedy":
            reason = f"Greedy Best-First Search prioritized cells with the lowest Manhattan distance heuristic to the treasure. Moving to {move_str} is the next step towards the treasure, and forward checking verified that a valid path to the treasure is preserved from this position."
        elif algorithm == "astar":
            reason = f"A* Search optimized the path using f(n) = g(n) + h(n), balancing actual step cost and heuristic distance. Moving to {move_str} is part of the overall shortest path, and forward checking verified that a valid path to the treasure is preserved from this position."
    else:
        reason = "No path to the treasure could be found. The agent is trapped or blocked by obstacles."
        
    return jsonify({
        "path": path,
        "visited": visited,
        "execution_time": execution_time,
        "valid_moves": valid_moves,
        "forward_checking": forward_checking,
        "chosen_move": chosen_move,
        "reason": reason
    })

if __name__ == "__main__":
    app.run(debug=True)
