// Logo oficial "G" de Google (multicolor), replicado como SVG inline para
// respetar las guias de marca. No usar el icono monocromatico de
// phosphor-icons para este boton: no es la marca registrada de Google.
export function GoogleIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M47.532 24.552c0-1.638-.146-3.21-.419-4.722H24.48v8.934h12.944c-.557 2.998-2.25 5.54-4.797 7.243v6.017h7.764c4.542-4.184 7.14-10.344 7.14-17.472z"
      />
      <path
        fill="#34A853"
        d="M24.48 48c6.48 0 11.914-2.147 15.885-5.816l-7.764-6.017c-2.153 1.444-4.908 2.296-8.121 2.296-6.247 0-11.54-4.219-13.432-9.888H2.99v6.211C6.939 42.52 15.03 48 24.48 48z"
      />
      <path
        fill="#FBBC05"
        d="M11.048 28.575a14.43 14.43 0 010-9.15v-6.211H2.99a23.936 23.936 0 000 21.572l8.058-6.211z"
      />
      <path
        fill="#EA4335"
        d="M24.48 9.537c3.524 0 6.69 1.212 9.18 3.59l6.886-6.886C36.39 2.36 30.956 0 24.48 0 15.03 0 6.939 5.48 2.99 13.213l8.058 6.211c1.892-5.669 7.185-9.887 13.432-9.887z"
      />
    </svg>
  );
}
