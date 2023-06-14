import React, {
  memo,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { Todo, TODO_STATUS } from '@/app/components/TodoItem/types'
import {
  Button,
  Collapse,
  notification,
  Space,
  Tooltip,
  Typography,
} from 'antd'
import styles from './categoryCard.module.scss'
import {
  ArrowUpOutlined,
  EditOutlined,
  PlusSquareOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons'
import { TodoItem } from '@/app/components/TodoItem/Todo'
import { Category } from '@/app/components/CategoryFormModal/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { CategoriesContext } from '@/app/contexts/Categories'
import { arrayMoveImmutable } from 'array-move'
import update from 'immutability-helper'

const { Panel } = Collapse
const { Title } = Typography

type Props = {
  isFirst: boolean
  isLast: boolean
  category: Category
  todoList: Todo[]
  currentDate: string
  onAddTaskClick: () => void
  onEditCategoryClick: () => void
  onAdd: (t: Todo) => Promise<{ previousTodoList: unknown }>
  onComplete: (
    t: Todo,
    status: TODO_STATUS
  ) => Promise<{ previousTodoList: unknown }>
}

type SortParams = {
  newPosition: number
}

export const _CategoryCard = ({
  isFirst,
  isLast,
  todoList,
  category,
  currentDate,
  onAddTaskClick,
  onEditCategoryClick,
  onAdd,
  onComplete,
}: Props) => {
  const queryClient = useQueryClient()
  const { categoryList } = useContext(CategoriesContext)

  const [localTodoList, setLocalTodoList] = useState<Todo[]>(todoList)
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    setLocalTodoList(todoList)
  }, [todoList])

  const getSortedCategories = (newPosition: number) => {
    const currentCategoryIndex = categoryList.findIndex(
      (c) => c.uuid === category.uuid
    )
    return arrayMoveImmutable(categoryList, currentCategoryIndex, newPosition)
  }

  const updateSortedTodoList = useCallback(
    (srcIndex: number, destIndex: number) => {
      setLocalTodoList((prevState) =>
        update(prevState, {
          $splice: [
            [srcIndex, 1],
            [destIndex, 0, prevState[srcIndex]],
          ],
        })
      )
    },
    []
  )

  const sortTodoList = useMutation({
    mutationFn: () =>
      axios.patch('/api/todos', {
        todoList: localTodoList,
        action: 'updateSortOrder',
      }),
    onMutate: async () => {
      await queryClient.cancelQueries(['getTodos', currentDate])
      const previousTodoList = queryClient.getQueryData([
        'getTodos',
        currentDate,
      ])
      queryClient.setQueryData(['getTodos', currentDate], localTodoList)
      return { previousTodoList }
    },
    onError: (error) => {
      console.log('ERROR: ', error)
      notification.error({
        message: <>Error sorting todo list. Check console for details.</>,
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries(['getTodos', currentDate])
    },
  })

  const sortCategory = useMutation({
    mutationFn: (req: SortParams) => {
      return axios.patch('/api/categories/sort', {
        categoryList: getSortedCategories(req.newPosition),
      })
    },
    onMutate: async (req: SortParams) => {
      await queryClient.cancelQueries(['getCategories'])
      const previousCategoriesList = queryClient.getQueryData(['getCategories'])
      queryClient.setQueryData(
        ['getCategories'],
        getSortedCategories(req.newPosition)
      )
      return { previousCategoriesList }
    },
    onSettled: () => {
      queryClient.invalidateQueries(['getCategories'])
    },
    onError: (error) => {
      console.log('ERROR: ', error)
      notification.error({
        message: <>Error updating category. Check console for details.</>,
      })
    },
  })

  const doneCount = todoList.filter(
    (t) => t.status === TODO_STATUS.DONE
  )?.length

  return (
    <Collapse
      defaultActiveKey={[category.uuid]}
      key={`category_${category.uuid}`}
      collapsible="icon"
      expandIconPosition={'end'}
      size={'small'}
      onChange={(uuidList) => setIsExpanded(uuidList.includes(category.uuid))}
    >
      <Panel
        key={category.uuid}
        header={
          <Space direction={'vertical'} style={{ width: '100%' }}>
            <Title
              level={5}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                margin: 0,
              }}
            >
              <div className={styles.categoryCardTitle}>
                {category.name}
                {!isExpanded && ` (${todoList.length})`}
                <div
                  className={styles.categoryCardDoneCount}
                  style={{
                    fontWeight: 500,
                    fontSize: '0.8rem',
                    marginLeft: '0.5em',
                  }}
                >
                  {doneCount > 0 && ` 🎉 x${doneCount}`}
                </div>
              </div>
              <div style={{ display: 'flex', marginLeft: '1em' }}>
                {!isFirst && (
                  <Tooltip title={'Move up'}>
                    <Button
                      icon={<ArrowUpOutlined />}
                      onClick={() =>
                        sortCategory.mutate({
                          newPosition: category.sortOrder - 1,
                        })
                      }
                    />
                  </Tooltip>
                )}
                {!isLast && (
                  <Tooltip title={'Move down'}>
                    <Button
                      icon={<ArrowDownOutlined />}
                      onClick={() =>
                        sortCategory.mutate({
                          newPosition: category.sortOrder + 1,
                        })
                      }
                    />
                  </Tooltip>
                )}
                <Tooltip title={'Edit Category'}>
                  <Button
                    icon={<EditOutlined />}
                    onClick={onEditCategoryClick}
                  />
                </Tooltip>
                <Tooltip title={'Add Task'}>
                  <Button
                    icon={<PlusSquareOutlined />}
                    onClick={onAddTaskClick}
                  />
                </Tooltip>
              </div>
            </Title>
            <Space style={{ marginBottom: '0.75em', fontSize: '0.8rem' }}>
              {category.description}
            </Space>
          </Space>
        }
      >
        {localTodoList.map((t: Todo, i) => (
          <TodoItem
            key={`todo_${t.id}`}
            todo={t}
            index={i}
            currentDate={currentDate}
            onDrag={updateSortedTodoList}
            onSort={() => sortTodoList.mutate()}
            onAddProgress={onAdd}
            onComplete={onComplete}
          />
        ))}
      </Panel>
    </Collapse>
  )
}

export const CategoryCard = memo(_CategoryCard)
