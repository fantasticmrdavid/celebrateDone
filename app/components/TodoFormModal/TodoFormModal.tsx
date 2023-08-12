import React, { useContext, useState } from 'react'
import {
  AutoComplete,
  DatePicker,
  Form,
  Input,
  Modal,
  notification,
  Radio,
  Select,
  Space,
} from 'antd'
import axios from 'axios'
import { Category } from '@/app/components/CategoryFormModal/types'
import {
  QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import dayjs from 'dayjs'
import { New_Todo, Todo } from '@/app/components/TodoItem/types'
import {
  TODO_PRIORITY,
  TODO_REPEAT_FREQUENCY,
  TODO_SIZE,
} from '@/app/components/TodoItem/utils'
import { CategoriesContext } from '@/app/contexts/Categories'
import { EditOutlined, PlusSquareOutlined } from '@ant-design/icons'
import { Get_Suggestions_Response } from '@/pages/api/todos/getSuggestions'
import { UserContext } from '@/app/contexts/User'
import { getLocalStartOfDay } from '@/app/utils'

import { TodoValidation, validateTodo } from './utils'
import { ValidationMessage } from '@/app/components/ValidationMessage/ValidationMessage'
import { SelectedDateContext } from '@/app/contexts/SelectedDate'

type TodoFormModalProps = {
  isOpen: boolean
  onCancel?: () => void
  category?: Category
  mode: TodoModal_Mode
  todo?: Todo
}

export enum TodoModal_Mode {
  ADD = 'ADD',
  EDIT = 'EDIT',
}

const sizeList = [
  {
    label: 'Small',
    value: TODO_SIZE.SMALL,
  },
  {
    label: 'Medium',
    value: TODO_SIZE.MEDIUM,
  },
  {
    label: 'Large',
    value: TODO_SIZE.LARGE,
  },
]

const priorityList = [
  {
    label: 'Normal',
    value: TODO_PRIORITY.NORMAL,
  },
  {
    label: 'Urgent',
    value: TODO_PRIORITY.URGENT,
  },
]

const { Option } = Select

export const TodoFormFormModal = (props: TodoFormModalProps) => {
  const { user } = useContext(UserContext)
  const { isOpen, onCancel, category: propsCategory, todo, mode } = props
  const [name, setName] = useState<string>(todo ? todo.name : '')
  const [startDate, setStartDate] = useState<string>(
    todo
      ? dayjs(new Date(todo.startDate)).startOf('day').toISOString()
      : dayjs(new Date()).startOf('day').toISOString(),
  )
  const [notes, setNotes] = useState<string>(todo ? todo.notes : '')
  const [size, setSize] = useState<TODO_SIZE>(
    todo ? todo.size : TODO_SIZE.SMALL,
  )
  const [priority, setPriority] = useState<TODO_PRIORITY>(
    todo ? todo.priority : TODO_PRIORITY.NORMAL,
  )
  const [category, setCategory] = useState<Category | undefined>(
    todo ? todo.category : propsCategory,
  )

  const [isRecurring, setIsRecurring] = useState(
    todo ? todo.isRecurring : false,
  )
  const [repeats, setRepeats] = useState(
    todo && todo.isRecurring ? todo.repeats : TODO_REPEAT_FREQUENCY.DAILY,
  )

  const [validation, setValidation] = useState<TodoValidation>({})

  const { data: suggestionList } = useQuery<Get_Suggestions_Response[]>(
    ['getTodoSuggestions'] as unknown as QueryKey,
    async () =>
      await fetch(`/api/todos/getSuggestions?user_id=${user?.uuid || ''}`).then(
        (res) => res.json(),
      ),
    {
      initialData: [],
    },
  )

  const queryClient = useQueryClient()

  const { categoryList, isFetchingCategories, isFetchingCategoriesError } =
    useContext(CategoriesContext)
  const { currentDate } = useContext(SelectedDateContext)

  const createTodo = useMutation({
    mutationFn: () =>
      axios.post('/api/todos', {
        name,
        startDate,
        notes,
        size,
        priority,
        category,
        isRecurring,
        repeats,
        user_id: user.uuid,
      } as New_Todo),
    onMutate: async () => {
      const previousTodoList = queryClient.getQueryData([
        'getTodos',
        currentDate,
      ]) as Todo[]
      queryClient.setQueryData(
        ['getTodos', currentDate],
        [
          ...previousTodoList,
          {
            name,
            startDate,
            notes,
            size,
            priority,
            category,
            isRecurring,
            repeats,
            user_id: user.uuid,
            uuid: `temp_newID`,
          },
        ],
      )
      if (onCancel) onCancel()
      return { previousTodoList }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['getTodos'])
      queryClient.invalidateQueries(['generateScheduledTodos'])
      notification.success({
        message: (
          <>
            <strong>{name}</strong> added to <strong>{category?.name}</strong>!
          </>
        ),
      })
      setName('')
      if (onCancel) onCancel()
    },
    onError: (error) => {
      console.log('ERROR: ', error)
      notification.error({
        message: <>Error adding todo. Check console for details.</>,
      })
    },
  })

  const saveTodo = useMutation({
    mutationFn: () =>
      axios.patch('/api/todos', {
        user_id: user.uuid,
        uuid: (todo as Todo).uuid,
        name,
        startDate,
        notes,
        size,
        priority,
        category,
        isRecurring,
        repeats,
        action: 'update',
      }),
    onMutate: async () => {
      const previousTodoList = queryClient.getQueryData([
        'getTodos',
        currentDate,
      ]) as Todo[]
      queryClient.setQueryData(
        ['getTodos', currentDate],
        [
          ...previousTodoList.map((t) =>
            t.uuid === (todo as Todo).uuid
              ? {
                  ...todo,
                  name,
                  startDate,
                  notes,
                  size,
                  priority,
                  category,
                  isRecurring,
                  repeats,
                }
              : t,
          ),
        ],
      )
      if (onCancel) onCancel()
      return { previousTodoList }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['getTodos'])
      queryClient.invalidateQueries(['generateScheduledTodos'])
      notification.success({
        message: (
          <>
            <strong>{name}</strong> updated!
          </>
        ),
      })
      if (onCancel) onCancel()
    },
    onError: (error) => {
      console.log('ERROR: ', error)
      notification.error({
        message: <>Error saving todo. Check console for details.</>,
      })
    },
  })

  if (isFetchingCategoriesError) return <div>ERROR LOADING CATEGORIES...</div>

  const isLoading = createTodo.isLoading || saveTodo.isLoading
  const getOkButtonLabel = () => {
    if (isLoading) return mode === TodoModal_Mode.ADD ? 'Adding Task' : 'Saving'
    return mode === TodoModal_Mode.ADD ? 'Add Task' : 'Save'
  }

  return (
    <Modal
      title={
        <>
          {mode === TodoModal_Mode.ADD ? (
            <>
              <PlusSquareOutlined /> Add Task
            </>
          ) : (
            <>
              <EditOutlined /> Edit Task
            </>
          )}
        </>
      }
      open={isOpen}
      onCancel={onCancel}
      onOk={() => {
        const validation = validateTodo({
          name,
        })
        if (Object.keys(validation).length > 0) return setValidation(validation)
        return mode === TodoModal_Mode.ADD
          ? createTodo.mutate()
          : saveTodo.mutate()
      }}
      okText={getOkButtonLabel()}
      okButtonProps={{
        loading: isLoading,
        disabled: isLoading,
      }}
    >
      <Space style={{ padding: '1em', width: '100%' }} direction={'vertical'}>
        <Form.Item label={'Name'}>
          <AutoComplete
            options={suggestionList.map((s) => ({ value: s.name }))}
            filterOption={(inputValue, option) => {
              return (
                (option?.value as string)
                  .toUpperCase()
                  .indexOf(inputValue.toUpperCase()) !== -1
              )
            }}
            status={validation.name ? 'error' : undefined}
            defaultValue={name}
            placeholder={'Enter the name for the task'}
            onChange={(val) => setName(val)}
          />
          {validation.name && <ValidationMessage message={validation.name} />}
        </Form.Item>
        <Form.Item label={'Size'}>
          <Radio.Group
            value={size}
            options={sizeList}
            buttonStyle={'solid'}
            optionType={'button'}
            onChange={(e) => setSize(e.target.value)}
          />
        </Form.Item>
        <Form.Item label={'Priority'}>
          <Radio.Group
            value={priority}
            options={priorityList}
            buttonStyle={'solid'}
            optionType={'button'}
            onChange={(e) => setPriority(e.target.value)}
          />
        </Form.Item>
        <Form.Item label={'Category'}>
          <Select
            defaultValue={isFetchingCategories ? undefined : category?.uuid}
            disabled={isFetchingCategories}
            onChange={(value) =>
              setCategory(categoryList.find((c) => c.uuid === value))
            }
            placeholder={
              isFetchingCategories
                ? 'Loading categories...'
                : 'Select a category for the task'
            }
            allowClear={false}
          >
            {categoryList.map((c) => (
              <Option key={`category_${c.uuid}`} value={c.uuid}>
                {c.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label={'Is visible from'}>
          <DatePicker
            value={dayjs(new Date(startDate))}
            allowClear={false}
            onChange={(_, dateString) =>
              setStartDate(getLocalStartOfDay(dateString))
            }
          />
        </Form.Item>
        <Form.Item label={'Recurring Task'}>
          <Radio.Group
            value={isRecurring}
            options={[
              {
                label: 'Yes',
                value: true,
              },
              {
                label: 'No',
                value: false,
              },
            ]}
            buttonStyle={'solid'}
            optionType={'button'}
            onChange={(e) => setIsRecurring(e.target.value)}
          />
        </Form.Item>
        {isRecurring && (
          <Form.Item label={'Repeat'}>
            <div
              style={{
                display: 'grid',
                gap: '0.5em',
                alignItems: 'center',
                gridTemplateColumns: 'auto auto 1fr',
              }}
            >
              <Select
                defaultValue={repeats}
                onChange={(value) => setRepeats(value)}
                allowClear={false}
                popupMatchSelectWidth={false}
              >
                {Object.values(TODO_REPEAT_FREQUENCY).map((r) => (
                  <Option key={`recurringDateType_${r}`} value={r}>
                    {r}
                  </Option>
                ))}
              </Select>{' '}
              after completion
            </div>
          </Form.Item>
        )}
        <Form.Item label={'Notes'}>
          <Input.TextArea
            placeholder={'Add any notes (optional)'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Form.Item>
      </Space>
    </Modal>
  )
}

export default TodoFormFormModal
