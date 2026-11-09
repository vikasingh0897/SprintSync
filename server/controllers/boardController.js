const { columnService, taskService, sprintService } = require('../services/dataService');
const { getIO } = require('../sockets/socketHandler');

// @desc    Get complete board structure with columns and their tasks
// @route   GET /api/board
// @access  Private
const getBoard = async (req, res) => {
  try {
    const { sprintId } = req.query;
    let targetSprintId = sprintId;

    if (!targetSprintId) {
      const activeSprint = await sprintService.getActive();
      targetSprintId = activeSprint ? (activeSprint._id || activeSprint.id) : null;
    }

    const columns = await columnService.getAll();
    const tasks = await taskService.getAll(targetSprintId ? { sprintId: targetSprintId } : {});

    // Map tasks to their respective columns
    const columnsWithTasks = columns.map((col) => ({
      id: col.columnId || col.id,
      title: col.title,
      color: col.color,
      order: col.order,
      tasks: tasks
        .filter((t) => t.columnId === (col.columnId || col.id))
        .map((t) => ({
          id: t._id || t.id,
          title: t.title,
          description: t.description,
          priority: t.priority,
          assignee: t.assignee,
          assigneeId: t.assigneeId,
          order: t.order,
          columnId: t.columnId,
          category: t.category,
          dueDate: t.dueDate,
          storyPoints: t.storyPoints,
        })),
    }));

    return res.json({
      success: true,
      data: {
        id: 'board-main',
        title: 'SprintSync Main Board',
        activeSprintId: targetSprintId,
        columns: columnsWithTasks,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add new column
// @route   POST /api/board/columns
// @access  Private
const addColumn = async (req, res) => {
  try {
    const { title, color } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Column title is required' });
    }

    const columnId = `col-${Date.now()}`;
    const newCol = await columnService.create({
      columnId,
      title,
      color: color || '#6366f1',
      order: 99,
    });

    const io = getIO();
    if (io) io.emit('column:created', newCol);

    return res.status(201).json({ success: true, data: newCol });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update column title/color
// @route   PUT /api/board/columns/:id
// @access  Private
const updateColumn = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await columnService.update(id, req.body);

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Column not found' });
    }

    const io = getIO();
    if (io) io.emit('column:updated', updated);

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete column
// @route   DELETE /api/board/columns/:id
// @access  Private
const deleteColumn = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await columnService.delete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Column not found' });
    }

    const io = getIO();
    if (io) io.emit('column:deleted', { id });

    return res.json({ success: true, message: 'Column deleted successfully', id });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getBoard,
  addColumn,
  updateColumn,
  deleteColumn,
};

