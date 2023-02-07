export default async (milliseconds: number) => {
  await new Promise<void>((res) => {
    setTimeout(() => res(), milliseconds)
  })
}
