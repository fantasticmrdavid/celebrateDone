import { NextApiRequest, NextApiResponse } from 'next'
import { dbConnect } from '@/config/dbConnect'
import { Todo } from '@/app/components/TodoItem/types'
import {
  TODO_PRIORITY,
  TODO_REPEAT_FREQUENCY,
  TODO_SIZE,
  TODO_STATUS,
} from '@/app/components/TodoItem/utils'

export type Get_Todos_Response = {
  uuid: string
  created: string
  startDate: string
  name: string
  notes: string
  size: TODO_SIZE
  priority: TODO_PRIORITY
  status: TODO_STATUS
  completedDateTime: string
  sortOrder: number
  schedules_count: number
  schedules_unit: TODO_REPEAT_FREQUENCY
  category_id: number
  category_uuid: string
  category_name: string
  category_description: string
  category_color: string
  category_maxPerDay: number
  category_sortOrder: number
  category_user_uuid: string
}

export function mapTodosResponse(results: Get_Todos_Response[]): Todo[] {
  return results.map((r, i) => ({
    uuid: r.uuid,
    created: r.created,
    startDate: r.startDate,
    name: r.name,
    notes: r.notes,
    size: TODO_SIZE[r.size],
    priority: TODO_PRIORITY[r.priority],
    status: TODO_STATUS[r.status],
    completedDateTime: r.completedDateTime,
    sortOrder: i,
    isRecurring: !!r.schedules_unit,
    repeats: r.schedules_unit,
    category: {
      uuid: r.category_uuid,
      name: r.category_name,
      description: r.category_description,
      color: r.category_color,
      maxPerDay: r.category_maxPerDay,
      sortOrder: r.category_sortOrder,
      user_id: r.category_user_uuid,
    },
  }))
}

export const getTodos = async (req: NextApiRequest, res: NextApiResponse) => {
  const { user_id, localStartOfDay, localEndOfDay } = req.query
  if (!user_id || user_id.length === 0) return {}

  try {
    const query = `SELECT
        t.id,
        t.uuid,
        t.created,
        t.startDate,
        t.name,
        t.notes,
        t.size,
        t.priority,
        t.status,
        t.completedDateTime,
        t.sortOrder,
        c.id AS category_id,
        c.name AS category_name,
        c.uuid AS category_uuid,
        c.description AS category_description,
        c.color AS category_color,
        c.maxPerDay AS category_maxPerDay,
        c.sortOrder AS category_sortOrder,
        c.user_uuid AS category_user_uuid,
        s.count AS schedules_count,
        s.unit AS schedules_unit
      FROM todos t
      LEFT JOIN todos_to_categories tc ON tc.todo_uuid = t.uuid
      LEFT JOIN categories c ON tc.category_id = c.uuid
      LEFT JOIN schedules s ON t.uuid = s.todo_id
      WHERE
      c.user_uuid = ? AND
      (
        (
            t.status != "${TODO_STATUS.DONE}" AND
           ? >= t.startDate
           ) OR
        (
          t.status = "${TODO_STATUS.DONE}" 
          AND t.completedDateTime >= ?
          AND t.completedDateTime <= ? 
        )
      )
      ORDER BY
        (t.status = "${TODO_STATUS.INCOMPLETE}") DESC,
        (t.priority = "${TODO_PRIORITY.URGENT}") DESC,
        (t.sortOrder) ASC,
        t.id, c.name, t.name ASC`
    const results = await dbConnect.query({
      sql: query,
      values: [user_id, localStartOfDay, localStartOfDay, localEndOfDay],
    })
    await dbConnect.end()
    return res
      .status(200)
      .json(mapTodosResponse(results as Get_Todos_Response[]))
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error })
  }
}
