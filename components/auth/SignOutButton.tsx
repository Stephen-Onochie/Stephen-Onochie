export default function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="text-sm font-inter text-textMuted hover:text-brownAccent transition-colors"
      >
        Sign out
      </button>
    </form>
  )
}
