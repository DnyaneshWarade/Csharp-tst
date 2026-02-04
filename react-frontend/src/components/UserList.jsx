import { useState } from 'react'
import './UserList.css'

function UserList({ users, selectedUserId, onUserSelect, onUserCreate, onUserUpdate }) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  const [formData, setFormData] = useState({ name: '', email: '', role: '' })
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.role) return
    
    if (editingUserId) {
      // Update existing user
      setIsUpdating(true)
      try {
        await onUserUpdate(editingUserId, formData)
        setFormData({ name: '', email: '', role: '' })
        setEditingUserId(null)
      } catch (error) {
        console.error('Error updating user:', error)
      } finally {
        setIsUpdating(false)
      }
    } else {
      // Create new user
      setIsCreating(true)
      try {
        await onUserCreate(formData)
        setFormData({ name: '', email: '', role: '' })
        setShowCreateForm(false)
      } catch (error) {
        console.error('Error creating user:', error)
      } finally {
        setIsCreating(false)
      }
    }
  }

  const handleCancel = () => {
    setFormData({ name: '', email: '', role: '' })
    setShowCreateForm(false)
    setEditingUserId(null)
  }

  const handleEdit = (user) => {
    setFormData({ name: user.name, email: user.email, role: user.role })
    setEditingUserId(user.id)
    setShowCreateForm(false)
  }

  return (
    <div className="user-list-container">
      <div className="user-list-header">
        <button 
          className="add-user-btn"
          onClick={() => setShowCreateForm(true)}
          disabled={showCreateForm || editingUserId}
        >
          + Add New User
        </button>
      </div>

      {(showCreateForm || editingUserId) && (
        <form className="create-user-form" onSubmit={handleSubmit}>
          <h3>{editingUserId ? 'Edit User' : 'Create New User'}</h3>
          <div className="form-row">
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-row">
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Role</option>
              <option value="developer">Developer</option>
              <option value="designer">Designer</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-btn"
              onClick={handleCancel}
              disabled={isCreating || isUpdating}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="create-btn"
              disabled={isCreating || isUpdating}
            >
              {editingUserId ? (isUpdating ? 'Updating...' : 'Update User') : (isCreating ? 'Creating...' : 'Create User')}
            </button>
          </div>
        </form>
      )}

      {users.length === 0 ? (
        <div className="empty-state">No users found</div>
      ) : (
        <div className="user-list">
          {users.map((user) => (
            <div
              key={user.id}
              className={`user-card ${selectedUserId === user.id ? 'selected' : ''} ${editingUserId === user.id ? 'editing' : ''}`}
            >
              <div className="user-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div 
                className="user-info"
                onClick={() => onUserSelect(user.id)}
              >
                <h3>{user.name}</h3>
                <p className="user-email">{user.email}</p>
                <span className="user-role">{user.role}</span>
              </div>
              <div className="user-actions">
                <button 
                  className="edit-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEdit(user)
                  }}
                  disabled={editingUserId && editingUserId !== user.id}
                >
                  ✏️ Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default UserList
