import React, { useState } from 'react'
import { SessionProvider } from 'next-auth/react'
import type { AppProps } from 'next/app'
import 'antd/dist/reset.css'
import '../styles/globals.css'

import dayjs from 'dayjs'
import updateLocale from 'dayjs/plugin/updateLocale'

import '@fontsource/raleway'
import '@fontsource/raleway/700.css'
import { ConfigProvider } from 'antd'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Template } from '@/app/components/Template/Template'

dayjs.extend(updateLocale)
dayjs.updateLocale('en', {
  weekStart: 1,
})

export default function MyApp({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <SessionProvider session={pageProps.session}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          theme={{
            token: {
              fontFamily:
                "Raleway, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,\n" +
                "  'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',\n" +
                "  'Noto Color Emoji'",
            },
          }}
        >
          <Template>
            <Component {...pageProps} />
          </Template>
        </ConfigProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
