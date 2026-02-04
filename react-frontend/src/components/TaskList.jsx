import { useState } from 'react'
import './TaskList.css'

function TaskList({ tasks, users, onTaskCreate, onTaskUpdate }) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [formData, setFormData] = useState({ title: '', status: 'pending', userId: '' })
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  console.log('TaskList rendered with users:', users)
  console.log('Users length:', users?.length || 0)

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title || !formData.status || !formData.userId) return
    
    if (editingTaskId) {
      // Update existing task
      setIsUpdating(true)
      try {
        await onTaskUpdate(editingTaskId, {
          ...formData,
          userId: parseInt(formData.userId)
        })
        setFormData({ title: '', status: 'pending', userId: '' })
        setEditingTaskId(null)
      } catch (error) {
        console.error('Error updating task:', error)
      } finally {
        setIsUpdating(false)
      }
    } else {
      // Create new task
      setIsCreating(true)
      try {
        await onTaskCreate({
          ...formData,
          userId: parseInt(formData.userId)
        })
        setFormData({ title: '', status: 'pending', userId: '' })
        setShowCreateForm(false)
      } catch (error) {
        console.error('Error creating task:', error)
      } finally {
        setIsCreating(false)
      }
    }
  }

  const handleCancel = () => {
    setFormData({ title: '', status: 'pending', userId: '' })
    setShowCreateForm(false)
    setEditingTaskId(null)
  }

  const handleEdit = (task) => {
    setFormData({ title: task.title, status: task.status, userId: task.userId.toString() })
    setEditingTaskId(task.id)
    setShowCreateForm(false)
  }

  if (tasks.length === 0 && !showCreateForm) {
    return (
      <div className="task-list-container">
        <div className="task-list-header">
          <button 
            className="add-task-btn"
            onClick={() => setShowCreateForm(true)}
          >
            + Add New Task
          </button>
        </div>
        <div className="empty-state">No tasks found</div>
      </div>
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#4caf50'
      case 'in-progress':
        return '#ff9800'
      case 'pending':
        return '#f44336'
      default:
        return '#9e9e9e'
    }
  }

  return (
    <div className="task-list-container">
      <div className="task-list-header">
        <button 
          className="add-task-btn"
          onClick={() => setShowCreateForm(true)}
          disabled={showCreateForm || editingTaskId}
        >
          + Add New Task
        </button>
      </div>

      {(showCreateForm || editingTaskId) && (
        <form className="create-task-form" onSubmit={handleSubmit}>
          <h3>{editingTaskId ? 'Edit Task' : 'Create New Task'}</h3>
          <div className="form-row">
            <input
              type="text"
              name="title"
              placeholder="Task title"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              required
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <select
              name="userId"
              value={formData.userId}
              onChange={handleInputChange}
              required
            >
              <option value="">Select User</option>
              {users && users.length > 0 ? (
                users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))
              ) : (
                <option disabled>Loading users...</option>
              )}
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={isCreating || isUpdating}>
              {editingTaskId ? (isUpdating ? 'Updating...' : 'Update Task') : (isCreating ? 'Creating...' : 'Create Task')}
            </button>
            <button type="button" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="task-list">
        {tasks.map((task) => {
          const user = users && users.length > 0 ? users.find(u => u.id === task.userId) : null
          return (
            <div key={task.id} className={`task-card ${editingTaskId === task.id ? 'editing' : ''}`}>
              <div className="task-header">
                <h3>{task.title}</h3>
                <div className="task-header-actions">
                  <span
                    className="task-status"
                    style={{ backgroundColor: getStatusColor(task.status) }}
                  >
                    {task.status}
                  </span>
                  <button 
                    className="edit-task-btn"
                    onClick={() => handleEdit(task)}
                    disabled={editingTaskId && editingTaskId !== task.id}
                  >
                    ✏️
                  </button>
                </div>
              </div>
              <div className="task-footer">
                <span className="task-id">Task #{task.id}</span>
                <span className="task-user">{user ? user.name : `User ID: ${task.userId}`}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TaskList
