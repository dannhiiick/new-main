import { jsx as _jsx } from "react/jsx-runtime";
const variantClasses = {
    green: 'bg-green-950/30 text-green-300',
    yellow: 'bg-yellow-950/30 text-yellow-300',
    red: 'bg-red-950/30 text-red-300',
    gray: 'bg-[#202024] text-zinc-400',
    blue: 'bg-blue-950/30 text-blue-300',
};
export function Badge({ label, variant }) {
    return (_jsx("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide ${variantClasses[variant]}`, children: label }));
}
