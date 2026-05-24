const INSTAGRAM_USERNAME = 'stephenconochie'

export default function InstagramFeed() {
  return (
    <div className="flex-1 border border-grid bg-beige overflow-hidden min-h-[320px]">
      <iframe
        src={`https://www.instagram.com/${INSTAGRAM_USERNAME}/embed`}
        title={`Instagram profile @${INSTAGRAM_USERNAME}`}
        className="w-full h-full min-h-[320px] border-0"
        loading="lazy"
        scrolling="no"
        allowTransparency={true}
      />
    </div>
  )
}
