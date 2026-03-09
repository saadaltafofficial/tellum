import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiProperty,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { FeedbackService } from './feedback.service';

class FeedbackResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty()
  solution_id!: string;

  @ApiProperty()
  new_success_rate!: number;

  @ApiProperty()
  new_confidence!: number;
}

@ApiTags('feedback')
@Controller('solutions')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Patch(':id/feedback')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'X-API-Key', required: true })
  @ApiOperation({ summary: 'Submit feedback for a solution' })
  @ApiResponse({ status: 200, type: FeedbackResponseDto })
  submit(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SubmitFeedbackDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<FeedbackResponseDto> {
    return this.feedbackService.submit(id, dto, request.agent!);
  }
}
