import time

def search(grid, start, goal):
    start_time = time.perf_counter()
    rows = len(grid)
    cols = len(grid[0])
    
    stack = [start]
    visited = []
    parent = {}
    visited_set = set()
    found = False
    
    while stack:
        curr = stack.pop()
        
        if curr in visited_set:
            continue
            
        visited.append(curr)
        visited_set.add(curr)
        
        if curr == goal:
            found = True
            break
            
        r, c = curr
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols:
                if grid[nr][nc] == 0 and (nr, nc) not in visited_set:
                    parent[(nr, nc)] = curr
                    stack.append((nr, nc))
                    
    path = []
    if found:
        curr = goal
        while curr != start:
            path.append(list(curr))
            curr = parent[curr]
        path.append(list(start))
        path.reverse()
        
    end_time = time.perf_counter()
    execution_time = (end_time - start_time) * 1000
    
    return {
        "path": path,
        "visited": [list(x) for x in visited],
        "execution_time": execution_time
    }
