import type { InputHTMLAttributes } from 'react'

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />
}
