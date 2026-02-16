import React from 'react'

const EmpathyResults = () => {
    return (
        <div
            id="empathy-results-container"
            className="empathy-results-container"
            data-teleport="empathy-results-container"
            style={{
                position: 'absolute',
                top: '64px',
                left: 0,
                width: '100%',
                zIndex: 999,
                backgroundColor: 'white'
            }}
        ></div>
    )
}

export default EmpathyResults
