import { useState, useEffect } from 'react'
import './App.css'
import { getUsers, createUser, updateUser, getUserById, getTasks, createTask, updateTask, getStats, checkHealth } from './services/api'
import UserList from './components/UserList'
import TaskList from './components/TaskList'
import Stats from './components/Stats'
import HealthStatus from './components/HealthStatus'

function App() {
  const [users, setUsers] = useState([])
  const [tasks, setTasks] = useState([])
  const [stats, setStats] = useState(null)
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [taskFilter, setTaskFilter] = useState('')

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Check health first
      const healthData = await checkHealth()
      setHealth(healthData)

      // Load data in parallel
      const [usersData, tasksData, statsData] = await Promise.all([
        getUsers(),
        getTasks(),
        getStats()
      ])

      setUsers(usersData.users || [])
      setTasks(tasksData.tasks || [])
      setStats(statsData)
      
      console.log('Loaded users:', usersData.users)
      console.log('Users state:', usersData.users || [])
    } catch (err) {
      setError(err.message || 'Failed to load data')
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUserSelect = async (userId) => {
    setSelectedUserId(userId)
    setLoading(true)
    setError(null)
    try {
      const user = await getUserById(userId)
      setSelectedUser(user)
      // Also filter tasks for this user
      const userTasks = await getTasks('', userId.toString())
      setTasks(userTasks.tasks || [])
    } catch (err) {
      setError(err.message || 'Failed to load user details')
      console.error('Error loading user:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTaskFilter = async (status) => {
    setTaskFilter(status)
    setLoading(true)
    setError(null)
    try {
      const tasksData = await getTasks(status, '')
      setTasks(tasksData.tasks || [])
    } catch (err) {
      setError(err.message || 'Failed to filter tasks')
      console.error('Error filtering tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUserCreate = async (userData) => {
    setLoading(true)
    setError(null)
    try {
      console.log('Creating user with data:', userData)
      await createUser(userData)
      // Refresh the users list
      const usersData = await getUsers()
      setUsers(usersData.users || [])
      // Also refresh stats
      const statsData = await getStats()
      setStats(statsData)
    } catch (err) {
      setError(err.message || 'Failed to create user')
      console.error('Error creating user:', err)
      throw err // Re-throw to let the form handle the error
    } finally {
      setLoading(false)
    }
  }

  const handleTaskCreate = async (taskData) => {
    setLoading(true)
    setError(null)
    try {
      console.log('Creating task with data:', taskData)
      await createTask(taskData)
      // Refresh the tasks list
      const tasksData = await getTasks()
      setTasks(tasksData.tasks || [])
      // Also refresh stats
      const statsData = await getStats()
      setStats(statsData)
    } catch (err) {
      setError(err.message || 'Failed to create task')
      console.error('Error creating task:', err)
      throw err // Re-throw to let the form handle the error
    } finally {
      setLoading(false)
    }
  }

  const handleUserUpdate = async (id, userData) => {
    setLoading(true)
    setError(null)
    try {
      console.log('Updating user with data:', userData)
      await updateUser(id, userData)
      // Refresh the users list
      const usersData = await getUsers()
      setUsers(usersData.users || [])
      // Also refresh stats if needed
      const statsData = await getStats()
      setStats(statsData)
    } catch (err) {
      setError(err.message || 'Failed to update user')
      console.error('Error updating user:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const handleTaskUpdate = async (id, taskData) => {
    setLoading(true)
    setError(null)
    try {
      console.log('Updating task with data:', taskData)
      await updateTask(id, taskData)
      // Refresh the tasks list
      const tasksData = await getTasks()
      setTasks(tasksData.tasks || [])
      // Also refresh stats
      const statsData = await getStats()
      setStats(statsData)
    } catch (err) {
      setError(err.message || 'Failed to update task')
      console.error('Error updating task:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    setSelectedUserId(null)
    setSelectedUser(null)
    setTaskFilter('')
    loadInitialData()
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Go Developer Test Project</h1>
        <p>React Frontend → Node.js Backend → Go Backend</p>
      </header>

      <HealthStatus health={health} />

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={handleRefresh}>Retry</button>
        </div>
      )}

      <div className="main-content">
        <div className="stats-section">
          {stats && <Stats stats={stats} />}
        </div>

        <div className="data-section">
          <div className="panel">
            <h2>Users</h2>
            {loading && !users.length ? (
              <div className="loading">Loading users...</div>
            ) : (
              <UserList
                users={users}
                selectedUserId={selectedUserId}
                onUserSelect={handleUserSelect}
                onUserCreate={handleUserCreate}
                onUserUpdate={handleUserUpdate}
              />
            )}
            {selectedUser && (
              <div className="user-details">
                <h3>Selected User Details</h3>
                <div className="detail-card">
                  <p><strong>Name:</strong> {selectedUser.name}</p>
                  <p><strong>Email:</strong> {selectedUser.email}</p>
                  <p><strong>Role:</strong> {selectedUser.role}</p>
                </div>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Tasks</h2>
              <div className="filter-buttons">
                <button
                  className={taskFilter === '' ? 'active' : ''}
                  onClick={() => handleTaskFilter('')}
                >
                  All
                </button>
                <button
                  className={taskFilter === 'pending' ? 'active' : ''}
                  onClick={() => handleTaskFilter('pending')}
                >
                  Pending
                </button>
                <button
                  className={taskFilter === 'in-progress' ? 'active' : ''}
                  onClick={() => handleTaskFilter('in-progress')}
                >
                  In Progress
                </button>
                <button
                  className={taskFilter === 'completed' ? 'active' : ''}
                  onClick={() => handleTaskFilter('completed')}
                >
                  Completed
                </button>
              </div>
            </div>
            {loading && !tasks.length ? (
              <div className="loading">Loading tasks...</div>
            ) : (
              <TaskList 
                tasks={tasks} 
                users={users}
                onTaskCreate={handleTaskCreate}
                onTaskUpdate={handleTaskUpdate}
              />
            )}
          </div>
        </div>
      </div>

      <footer className="app-footer">
        <button onClick={handleRefresh} className="refresh-btn">
          🔄 Refresh All Data
        </button>
      </footer>
    </div>
  )
}

export default App
