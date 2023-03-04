import React, { useState } from 'react'
import { QueryKey, useMutation, useQuery } from '@tanstack/react-query'
import { Todo, TODO_STATUS } from '@/app/components/Todo/types'
import { Button, Card, Checkbox, Space } from 'antd'
import axios from 'axios'
import ConfettiExplosion from 'react-confetti-explosion'
import AddTodoFormModal from '@/app/components/AddTodoFormModal/AddTodoFormModal'

type Update_Todo_Complete_Params = {
  action: string
  id: number
  status: TODO_STATUS
  completedDateTime: number | undefined
}

type Todo_Category = {
  id: number
  name: string
  description: string
}

export const TodoList = () => {
  const [isExploding, setIsExploding] = useState<boolean>(false)
  const [isAddTodoModalOpen, setIsTodoModalOpen] = useState<boolean>(false)
  const [todoModalCategory, setTodoModalCategory] = useState<
    Todo_Category | undefined
  >()
  const {
    isLoading,
    error,
    data: todoList = [],
    refetch: refetchTodoList,
  } = useQuery(
    ['getTodos'] as unknown as QueryKey,
    async () => await fetch('/api/todos').then((res) => res.json())
  )

  const updateTodo = useMutation({
    mutationFn: (req: Update_Todo_Complete_Params) =>
      axios.patch('/api/todos', {
        action: req.action,
        id: req.id,
        status: req.status,
        completedDateTime: req.completedDateTime,
      }),
    onSuccess: (res) => {
      const isDone = JSON.parse(res.config.data).status === TODO_STATUS.DONE
      if (isDone) setIsExploding(true)
      setTimeout(() => {
        setIsExploding(false)
      }, 3000)
      refetchTodoList()
    },
    onError: (e) => {
      console.error('ERROR: ', e)
    },
  })

  if (isLoading) return <div>LOADING TODOS...</div>

  if (error) return <div>ERROR FETCHING TODOS...</div>

  const handleOnChange = (t: Todo) => {
    const shouldMarkCompleted = t.status !== TODO_STATUS.DONE
    updateTodo.mutate({
      action: 'complete',
      id: t.id,
      status: shouldMarkCompleted ? TODO_STATUS.DONE : TODO_STATUS.INCOMPLETE,
      completedDateTime: shouldMarkCompleted ? Date.now() : undefined,
    })
  }

  const categoryList: Todo_Category[] = todoList.reduce(
    (acc: Todo_Category[], currTodo: Todo) => {
      if (!acc.find((c) => c.id === currTodo.category_id)) {
        return [
          ...acc,
          {
            id: currTodo.category_id,
            name: currTodo.category_name,
            description: currTodo.category_description,
          },
        ]
      }
      return acc
    },
    []
  )

  return (
    <Space
      size={'small'}
      align={'start'}
      style={{ display: 'flex', flexWrap: 'wrap' }}
    >
      <Space
        style={{
          position: 'absolute',
          width: '100%',
          display: 'flex',
          justifyContent: 'space-around',
        }}
      >
        {isExploding && (
          <ConfettiExplosion
            force={0.8}
            duration={3000}
            particleCount={250}
            width={1600}
          />
        )}
      </Space>
      {categoryList.map((c) => (
        <Card
          key={`category_${c.id}`}
          title={c.name}
          size={'small'}
          extra={
            <Button
              onClick={() => {
                setTodoModalCategory(c)
                setIsTodoModalOpen(true)
              }}
            >
              + Task
            </Button>
          }
        >
          <Space style={{ marginBottom: '0.75em', fontSize: '0.8rem' }}>
            {c.description}
          </Space>
          <div>
            {todoList
              .filter((t: Todo) => t.category_id === c.id)
              .sort((a: Todo) => (a.status === TODO_STATUS.DONE ? 1 : -1))
              .map((t: Todo) => {
                const isDone = t.status === TODO_STATUS.DONE
                return (
                  <div key={`todo_${t.id}`}>
                    <Checkbox
                      checked={isDone}
                      onChange={() => handleOnChange(t)}
                    />{' '}
                    {!isDone ? (
                      t.name
                    ) : (
                      <span style={{ textDecoration: 'line-through' }}>
                        {t.name}
                      </span>
                    )}
                  </div>
                )
              })}
          </div>
        </Card>
      ))}
      {isAddTodoModalOpen && (
        <AddTodoFormModal
          isOpen={true}
          onCancel={() => setIsTodoModalOpen(false)}
          category={todoModalCategory}
        />
      )}
    </Space>
  )
}
