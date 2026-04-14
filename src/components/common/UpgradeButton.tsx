import React from 'react'
import styled from '@emotion/styled'
import { Button as AntdButton, ButtonProps } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import { deviceSizes } from '../../utils/device-sizes'

export const testIDs = {
  upgradeButton: 'upgradeButton',
  aiPromptButton: 'aiPromptButton',
}

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
  height: auto;
  overflow: hidden;
  margin-top: 28px;

  @media ${deviceSizes.mobile} {
    flex-direction: column;
  }
`

const Button = styled(AntdButton)`
  border-radius: 5px;
`

const AiPromptButton = styled(Button)`
  && {
    background: linear-gradient(135deg, #ff6fb5 0%, #59c4ff 100%) !important;
    border: 0;
    box-shadow: 0 2px 0 rgba(89, 196, 255, 0.24);
    color: #fff;
  }

  &&:hover {
    opacity: 0.8;
  }
`

interface UpgradeButtonProps extends React.PropsWithRef<ButtonProps> {
  onShowDiff: () => void
  showAiPromptButton?: boolean
  onAiPromptClick?: () => Promise<void>
}

const UpgradeButton = React.forwardRef<
  HTMLElement,
  UpgradeButtonProps & React.RefAttributes<HTMLElement>
>(
  (
    { onShowDiff, showAiPromptButton = false, onAiPromptClick, ...props },
    ref
  ) => (
    <Container>
      <Button
        {...props}
        ref={ref}
        type="primary"
        size="large"
        data-testid={testIDs.upgradeButton}
        onClick={onShowDiff}
      >
        Show me how to upgrade!
      </Button>

      {showAiPromptButton && (
        <AiPromptButton
          type="primary"
          size="large"
          data-testid={testIDs.aiPromptButton}
          onClick={onAiPromptClick}
        >
          Copy for AI
          <CopyOutlined />
        </AiPromptButton>
      )}
    </Container>
  )
)

export default UpgradeButton
