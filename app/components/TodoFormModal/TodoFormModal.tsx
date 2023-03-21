import React, { useContext, useState } from 'react'
import {
  AutoComplete,
  DatePicker,
  Form,
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
import {
  New_Todo,
  Todo,
  TODO_PRIORITY,
  TODO_SIZE,
} from '@/app/components/TodoItem/types'
import { CategoriesContext } from '@/app/contexts/Categories'
import { EditOutlined, PlusSquareOutlined } from '@ant-design/icons'
import { Get_Suggestions_Response } from '@/pages/api/todos/getSuggestions'

type TodoFormModalProps = {
  isOpen: boolean
  onCancel?: () => any
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
  const { isOpen, onCancel, category: propsCategory, todo, mode } = props
  const [name, setName] = useState<string>(todo ? todo.name : '')
  const [startDate, setStartDate] = useState<string>(
    todo
      ? new Date(todo.startDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  )
  const [size, setSize] = useState<TODO_SIZE>(
    todo ? todo.size : TODO_SIZE.SMALL
  )
  const [priority, setPriority] = useState<TODO_PRIORITY>(
    todo ? todo.priority : TODO_PRIORITY.NORMAL
  )
  const [category, setCategory] = useState<Category | undefined>(
    todo ? todo.category : propsCategory
  )

  const { data: suggestionList } = useQuery<Get_Suggestions_Response[]>(
    ['getTodoSuggestions'] as unknown as QueryKey,
    async () =>
      await fetch('/api/todos/getSuggestions').then((res) => res.json()),
    {
      initialData: [],
    }
  )

  const queryClient = useQueryClient()

  const { categoryList, isFetchingCategories, isFetchingCategoriesError } =
    useContext(CategoriesContext)

  const createTodo = useMutation({
    mutationFn: () =>
      axios.post('/api/todos', {
        name,
        startDate,
        size,
        priority,
        category,
      } as New_Todo),
    onSuccess: () => {
      queryClient.invalidateQueries(['getTodos'])
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
    onError: () => {
      console.log('ERROR')
    },
  })

  const saveTodo = useMutation({
    mutationFn: () =>
      axios.patch('/api/todos', {
        id: (todo as Todo).id,
        name,
        startDate,
        size,
        priority,
        category,
        action: 'update',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['getTodos'])
      notification.success({
        message: (
          <>
            <strong>{name}</strong> updated!
          </>
        ),
      })
      if (onCancel) onCancel()
    },
    onError: () => {
      console.log('ERROR')
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
      onOk={() =>
        mode === TodoModal_Mode.ADD ? createTodo.mutate() : saveTodo.mutate()
      }
      okText={getOkButtonLabel()}
      okButtonProps={{
        loading: isLoading,
        disabled: isLoading,
      }}
    >
      <Space style={{ padding: '1em' }} direction={'vertical'}>
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
            defaultValue={name}
            placeholder={'Enter the name for the task'}
            onChange={(val) => setName(val)}
          />
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
            onChange={(_, dateString) => setStartDate(dateString)}
          />
        </Form.Item>
      </Space>
    </Modal>
  )
}

export default TodoFormFormModal
