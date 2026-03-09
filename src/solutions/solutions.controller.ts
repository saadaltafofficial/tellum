import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { CreateSolutionDto } from './dto/create-solution.dto';
import { SearchSolutionsDto } from './dto/search-solutions.dto';
import {
  CreateSolutionResponseDto,
  SearchSolutionsResponseDto,
  SolutionDetailResponseDto,
} from './dto/solution-response.dto';
import { SolutionsService } from './solutions.service';

@ApiTags('solutions')
@Controller('solutions')
export class SolutionsController {
  constructor(private readonly solutionsService: SolutionsService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'X-API-Key', required: true })
  @ApiOperation({ summary: 'Submit a solution' })
  @ApiResponse({ status: 201, type: CreateSolutionResponseDto })
  create(
    @Body() dto: CreateSolutionDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<CreateSolutionResponseDto> {
    return this.solutionsService.create(dto, request.agent!);
  }

  @Post('search')
  @ApiOperation({ summary: 'Search solutions by text or embedding' })
  @ApiResponse({ status: 200, type: SearchSolutionsResponseDto })
  search(
    @Body() dto: SearchSolutionsDto,
  ): Promise<SearchSolutionsResponseDto> {
    return this.solutionsService.search(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific solution by ID' })
  @ApiResponse({ status: 200, type: SolutionDetailResponseDto })
  getById(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<SolutionDetailResponseDto> {
    return this.solutionsService.getById(id);
  }
}
