import React, { useState } from 'react'
import type { AppProps } from 'next/app'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, Layout } from 'antd'
import 'antd/dist/reset.css'
import styles from './styles.module.scss'

import Head from 'next/head'

import { CategoriesProvider } from '@/app/contexts/Categories'
import HeaderNav from '@/app/components/HeaderNav/HeaderNav'
import { UserProvider } from '@/app/contexts/User'
import { UserSelector } from '@/app/components/UserSelector/UserSelector'

const { Content } = Layout

export default function MyApp({ Component, pageProps }: AppProps) {
  const [queryClient] = React.useState(() => new QueryClient())
  const [uuid, setUuid] = useState<string>()

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        {uuid ? (
          <UserProvider uuid={uuid}>
            <CategoriesProvider>
              <Head>
                <title>CelebrateDone</title>
              </Head>
              <Layout>
                <HeaderNav />
                <Content className={styles.content}>
                  <Component {...pageProps} />
                </Content>
              </Layout>
            </CategoriesProvider>
          </UserProvider>
        ) : (
          <UserSelector onSelect={(uuid) => setUuid(uuid)} />
        )}
      </ConfigProvider>
    </QueryClientProvider>
  )
}
