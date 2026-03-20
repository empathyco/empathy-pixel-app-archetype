import React from 'react'

interface Props {
    children?: React.ReactNode
}

const EmpathyResults: React.FC<Props> = ({ children }) => {

    return (
        <div data-teleport="empathy-results-container" id="empathy-results-container">
            {children}
        </div>
    )
}

export default EmpathyResults
