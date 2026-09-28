import heapq
import time

def search(grid, start, goal):
    start_time = time.perf_counter()
    rows = len(grid)
    cols = len(grid[0])
    
    def heuristic(node):
        return abs(node[0] - goal[0]) + abs(node[1] - goal[1])
        
    heap = []
    heapq.heappush(heap, (heuristic(start), start))
    visited = []
    parent = {}
    g_score = {start: 0}
    visited_set = set()
    found = False
    
    while heap:
        priority, curr = heapq.heappop(heap)
        if curr in visited_set:
            continue
        visited_set.add(curr)
        visited.append(curr)
        
        if curr == goal:
            found = True
            break
            
        r, c = curr
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols:
                if grid[nr][nc] == 0:
                    neighbor = (nr, nc)
                    tentative_g = g_score[curr] + 1
                    if neighbor not in g_score or tentative_g < g_score[neighbor]:
                        g_score[neighbor] = tentative_g
                        parent[neighbor] = curr
                        f_score = tentative_g + heuristic(neighbor)
                        heapq.heappush(heap, (f_score, neighbor))
                        
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
