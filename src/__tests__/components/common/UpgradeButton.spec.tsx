import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import UpgradeButton, {
  testIDs,
} from '../../../components/common/UpgradeButton'

describe('UpgradeButton', () => {
  it('does not render the AI prompt button until the prompt is ready', () => {
    const { queryByTestId } = render(<UpgradeButton onShowDiff={jest.fn()} />)

    expect(queryByTestId(testIDs.aiPromptButton)).toBeNull()
  })

  it('shows the AI prompt button and triggers copy when clicked', async () => {
    const onAiPromptClick = jest.fn().mockResolvedValue(undefined)
    const { getByTestId } = render(
      <UpgradeButton
        onShowDiff={jest.fn()}
        showAiPromptButton={true}
        onAiPromptClick={onAiPromptClick}
      />
    )

    fireEvent.click(getByTestId(testIDs.aiPromptButton))

    await waitFor(() => {
      expect(onAiPromptClick).toHaveBeenCalledTimes(1)
    })
  })
})
