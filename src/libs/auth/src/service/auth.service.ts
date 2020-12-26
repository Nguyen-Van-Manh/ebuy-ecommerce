import { HttpStatus, Injectable, InternalServerErrorException, HttpException } from '@nestjs/common';
import {
    LoginInput, NativeAuthenticationResult, ErrorCode,
    CreateUserInput, RegisterUserAccountResult, User
} from 'src/generate-types';
import { UserAuth } from '../hook/useAuth';
import { JwtService } from '@nestjs/jwt';
import * as mongoose from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { TokenDocument, Token } from '../schema/token.schema';
import { Model } from 'mongoose';

@Injectable()
export class AuthService {
    constructor(
        private useAuth: UserAuth,
        private jwtService: JwtService,
        @InjectModel(Token.name) private tokenModel: Model<TokenDocument>
        ) {}
    

    private generateToken(user: User | any): string {
        const payload = { _id: user._id }
        return this.jwtService.sign(payload, {secret: 'secretKey'})
    }
    async validateUser(input: LoginInput, user: any): Promise<NativeAuthenticationResult> {

        const passwordValidate = await this.useAuth.valiatePassword(input.password, user!.password)
        if (passwordValidate == false) {
            return {
                errorCode: ErrorCode.NativeAuthStrategyError,
                message: 'Email or password is wrong'
            }
        }
        else {
            const accessToken = await this.generateToken(user)
            const instanceAccessToken = new this.tokenModel();
            instanceAccessToken.userId = user.id;
            instanceAccessToken.tokenId = accessToken;
            const expride = new Date().getTime() + 2592000000;
            instanceAccessToken.exprideDate = new Date(expride);
            await instanceAccessToken.save()
            return {
                user: user,
                token: accessToken
            }
        }
    }

    async createUser(input: CreateUserInput): Promise<CreateUserInput> {
        try {
            const hashPassword = await this.useAuth.hashPassword(input.password)
            input.password = hashPassword
            return input
        }
        catch(e) {
            throw new InternalServerErrorException(e?.message || 'Can not connect to server')
        }
    }
    async findUserById(_id: string): Promise<any> {
        console.log("running here")
        const test = await this.tokenModel.findOne()
        // console.log(test)
        return test
        // return user;
    }
    async checkExprideToken(userId: string, tokenId: string) {
        const instanceOfTokenModel = await this.tokenModel.findOne({
            userId: userId,
            tokenId: tokenId
        })
        if (!instanceOfTokenModel) {
            throw new HttpException('You are not logged in', HttpStatus.UNAUTHORIZED)
        }
    }
}