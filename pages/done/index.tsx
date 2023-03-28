import React, { useContext, useRef, useState } from 'react'
import { Radio, Space, Spin, Tag } from 'antd'
import { QueryKey, useQuery } from '@tanstack/react-query'
import { Todo, TODO_SIZE } from '@/app/components/TodoItem/types'
import { DoneCount } from '@/app/components/DoneCount/DoneCount'
import { sizeTags } from '@/app/components/TodoItem/Todo'
import { UserContext } from '@/app/contexts/User'

import { Fireworks } from '@fireworks-js/react'
import type { FireworksHandlers } from '@fireworks-js/react'

import styles from './donePage.module.scss'
import {
  getLocalEndOfDay,
  getLocalEndOfMonth,
  getLocalEndOfWeek,
  getLocalEndOfYear,
  getLocalStartOfDay,
  getLocalStartOfMonth,
  getLocalStartOfWeek,
  getLocalStartOfYear,
} from '@/app/utils'
import { dateIsoToSql } from '@/pages/api/utils'

enum DateRangeType {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}

const titleStrings = {
  [DateRangeType.DAY]: 'Today',
  [DateRangeType.WEEK]: 'This Week',
  [DateRangeType.MONTH]: 'This Month',
  [DateRangeType.YEAR]: 'This Year',
}

export const DonePage = () => {
  const today = new Date()
  const { user, isFetchingUser } = useContext(UserContext)
  const [currentDate, setCurrentDate] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(today.getDate()).padStart(2, '0')}`
  )
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>(
    DateRangeType.DAY
  )

  const getDateRangeQuery = () => {
    if (dateRangeType === DateRangeType.DAY) {
      return `dateRangeStart=${dateIsoToSql(getLocalStartOfDay(currentDate))}
        &dateRangeEnd=${dateIsoToSql(getLocalEndOfDay(currentDate))}`
    }
    if (dateRangeType === DateRangeType.WEEK) {
      return `dateRangeStart=${dateIsoToSql(getLocalStartOfWeek(currentDate))}
        &dateRangeEnd=${dateIsoToSql(getLocalEndOfWeek(currentDate))}`
    }
    if (dateRangeType === DateRangeType.MONTH) {
      return `dateRangeStart=${dateIsoToSql(getLocalStartOfMonth(currentDate))}
        &dateRangeEnd=${dateIsoToSql(getLocalEndOfMonth(currentDate))}`
    }
    if (dateRangeType === DateRangeType.YEAR) {
      return `dateRangeStart=${dateIsoToSql(getLocalStartOfYear(currentDate))}
        &dateRangeEnd=${dateIsoToSql(getLocalEndOfYear(currentDate))}`
    }
  }

  const {
    isLoading,
    error,
    data: todoList,
  } = useQuery<Todo[]>(
    ['getDoneTodos', currentDate, dateRangeType] as unknown as QueryKey,
    async () =>
      await fetch(
        `/api/todos/done?user_id=${user.uuid}&${getDateRangeQuery()}`
      ).then((res) => res.json())
  )
  const ref = useRef<FireworksHandlers>(null)

  if (isLoading || !todoList)
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Spin tip="Loading..." size="large" />
      </div>
    )

  if (error) return <div>ERROR FETCHING TODOS...</div>

  return (
    <Space direction={'vertical'} align={'center'} style={{ width: '100%' }}>
      <div style={{ padding: '1em 0' }}>
        <Radio.Group
          value={dateRangeType}
          buttonStyle="solid"
          onChange={(e) => setDateRangeType(e.target.value)}
        >
          <Radio.Button value={DateRangeType.DAY}>Today</Radio.Button>
          <Radio.Button value={DateRangeType.WEEK}>This Week</Radio.Button>
          <Radio.Button value={DateRangeType.MONTH}>This Month</Radio.Button>
          <Radio.Button value={DateRangeType.YEAR}>This Year</Radio.Button>
        </Radio.Group>
      </div>
      <Space size={'middle'} className={styles.container}>
        <div className={styles.bg}>
          <Fireworks
            ref={ref}
            options={{ delay: { min: 100, max: 500 } }}
            style={{
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              position: 'absolute',
            }}
          />
        </div>
        <div className={styles.content}>
          <DoneCount count={todoList.length} />
          <div>
            <h1>
              What I did {titleStrings[dateRangeType].toLocaleLowerCase()}:
            </h1>
            <ul
              style={{
                fontSize: '1rem',
                lineHeight: 1.25,
                padding: 0,
                listStylePosition: 'inside',
                listStyle: 'none',
              }}
            >
              {todoList.map((t) => (
                <li key={`todo_${t.id}`} className={styles.doneItem}>
                  {t.name}{' '}
                  {t.size !== TODO_SIZE.SMALL && (
                    <Tag color={sizeTags[t.size].color}>
                      {sizeTags[t.size].label}
                    </Tag>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Space>
    </Space>
  )
}

export default DonePage
